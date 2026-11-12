/**
 * @file app/feed.xml/route.js
 * @description Generates a valid RSS 2.0 syndication feed containing the 25 most recent active job vacancies.
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { getStartOfDayIST, isJobExpired } from '@/lib/time';
import siteConfig from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const startOfToday = getStartOfDayIST(new Date());
    const query = {
      status: 'published',
      ...(startOfToday ? { $or: [{ lastDate: null }, { lastDate: { $gte: startOfToday } }] } : {}),
    };

    const rawJobs = await Job.find(query).sort({ createdAt: -1 }).limit(30).lean();

    const activeJobs = rawJobs.filter((j) => !isJobExpired(j.lastDate)).slice(0, 25);
    const now = new Date();

    const rssItems = activeJobs
      .map((job) => {
        const itemUrl = `${siteConfig.url}/jobs/${job.slug}`;
        const pubDate = job.createdAt ? new Date(job.createdAt).toUTCString() : now.toUTCString();
        const locationsStr = Array.isArray(job.locations)
          ? job.locations.join(', ')
          : job.locations;
        const description = `Company: ${job.company?.name} | Location: ${locationsStr} | Type: ${job.type} (${job.workMode})\n\n${job.summary || ''}`;

        return `    <item>
      <title><![CDATA[${job.title} at ${job.company?.name || 'Company'}]]></title>
      <link>${itemUrl}</link>
      <guid isPermaLink="true">${itemUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${siteConfig.name} — ${siteConfig.tagline}]]></title>
    <link>${siteConfig.url}</link>
    <description><![CDATA[${siteConfig.description}]]></description>
    <language>en-in</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err) {
    console.error('RSS Feed generation error:', err);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}
