import Layout from "@/components/Layout";
import InvoiceWizard from "@/components/InvoiceWizard";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <InvoiceWizard />
      </div>
    </Layout>
  );
}
