import { Home, Droplet, Map, Trophy, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Droplet, label: t("nav.moisture"), path: "/moisture" },
    { icon: Map, label: "Map", path: "/farm-map" },
    { icon: Trophy, label: "Rank", path: "/leaderboard" },
    { icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 flex-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
