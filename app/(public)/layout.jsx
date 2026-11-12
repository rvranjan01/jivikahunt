import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Public portal layout wrapping public routes with standard brand navigation and footer.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
