import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-border shadow-soft">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">LexiMate</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-smooth">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">
              About
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="hover:bg-secondary"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-medium transition-smooth"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;