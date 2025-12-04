import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import AIAssistant from "@/components/ai/AIAssistant";
import { FileText, MessageSquare, Shield, Zap, Clock, Award } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Smart Document Generation",
      description: "Create NDAs, contracts, and legal documents with AI-powered templates"
    },
    {
      icon: MessageSquare,
      title: "24/7 Legal Assistant",
      description: "Get instant answers to legal questions from our AI assistant"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Bank-level security with full legal compliance standards"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Generate legal documents in minutes, not hours"
    },
    {
      icon: Clock,
      title: "Save Time & Money",
      description: "Reduce legal costs by up to 80% with automated processes"
    },
    {
      icon: Award,
      title: "Expert-Reviewed",
      description: "All templates reviewed by qualified legal professionals"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-8">
            <AIAssistant size="lg" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up">
            Your Smart Legal Assistant
          </h1>
          <p className="text-xl text-muted-foreground mb-4 animate-slide-up" style={{animationDelay: "0.2s"}}>
            Contracts, Guidance, and More
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: "0.4s"}}>
            Streamline your legal workflows with AI-powered document generation, 
            expert guidance, and intelligent automation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{animationDelay: "0.6s"}}>
            <Button 
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg shadow-medium transition-bounce"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="px-8 py-4 text-lg border-primary text-primary hover:bg-primary/5 transition-smooth"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Powerful Features for Legal Professionals
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to streamline your legal workflows and deliver exceptional results to your clients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-medium transition-smooth">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-8">
            <AIAssistant size="md" showGlow={false} />
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Legal Practice?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of legal professionals who trust LexiMate for their document generation and legal guidance needs.
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => navigate('/signup')}
            className="px-8 py-4 text-lg transition-bounce"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-accent text-accent-foreground">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">L</span>
            </div>
            <span className="text-xl font-bold">LexiMate</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 LexiMate. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;