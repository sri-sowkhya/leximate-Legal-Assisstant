import aiAssistantImage from "@/assets/ai-assistant.png";

interface AIAssistantProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showGlow?: boolean;
}

const AIAssistant = ({ size = "md", className = "", showGlow = true }: AIAssistantProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`
        ${sizeClasses[size]} 
        rounded-full 
        ${showGlow ? "ai-glow" : "shadow-medium"}
        overflow-hidden
        transition-smooth
        hover:scale-105
        animate-float
      `}>
        <img 
          src={aiAssistantImage} 
          alt="LexiMate AI Assistant"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default AIAssistant;