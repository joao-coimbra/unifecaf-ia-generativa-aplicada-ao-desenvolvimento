import { Button } from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@unifecaf-ia-generativa-aplicada-ao-desenvolvimento/ui/components/tooltip";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useEffectEvent, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  const handleToggle = useEffectEvent(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  });

  const isDark = montado && resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            onClick={handleToggle}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Modo claro" : "Modo escuro"}</TooltipContent>
    </Tooltip>
  );
}
