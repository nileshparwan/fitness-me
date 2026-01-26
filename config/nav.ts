// config/nav.ts
import { 
    LayoutDashboard, 
    Dumbbell, 
    BookOpen, 
    TrendingUp, 
    Utensils, 
    Bot, 
    Settings, 
    LineChart 
  } from "lucide-react";
  
  export const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Workouts",
      href: "/workouts",
      icon: Dumbbell,
    },
    {
      title: "Exercises",
      href: "/exercises",
      icon: BookOpen,
    },
    {
      title: "Progress",
      href: "/progress",
      icon: TrendingUp,
    },
    {
      title: "Nutrition",
      href: "/progress/nutrition",
      icon: Utensils,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: LineChart,
    },
    {
      title: "AI Coach",
      href: "/ai-coach",
      icon: Bot,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];