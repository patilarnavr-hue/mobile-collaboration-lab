import { Home, Droplet, Clock, Sprout, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Droplet, label: t("nav.moisture"), path: "/moisture" },
    { icon: Clock, label: t("nav.schedule"), path: "/schedule" },
    { icon: Sprout, label: t("nav.fertility"), path: "/fertility" },
    { icon: User, label: t("nav.profile"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 flex-1 rounded-2xl transition-all duration-200",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
