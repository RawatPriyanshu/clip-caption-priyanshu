import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
    </main>
  );
};

export default Index;
