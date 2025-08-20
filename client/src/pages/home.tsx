import Layout from "@/components/Layout";
import InvoiceWizard from "@/components/InvoiceWizard";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <InvoiceWizard />
      </div>
    </Layout>
  );
}
