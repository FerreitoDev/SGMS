---
name: shadcn-tailwind-patterns
description: Padrões de desenvolvimento para React, Tailwind CSS e shadcn/ui, ergonomia para tablets/smartphones industriais, componentes acessíveis e formulários com react-hook-form e Zod.
---

# Skill: Componentização com shadcn/ui & Tailwind CSS

Esta skill padroniza o desenvolvimento visual e interativo no frontend do SECOM.

## 1. Regra de Ouro: Reuse Primitivos de `@/components/ui`
- **NUNCA crie botões, modais ou inputs artesanais com tags HTML puras ou CSS customizado**.
- Utilize sempre os componentes oficiais do shadcn já instalados no projeto:
  - Botões $\rightarrow$ `import { Button } from "@/components/ui/button"`
  - Modais $\rightarrow$ `import { Dialog, DialogContent, ... } from "@/components/ui/dialog"`
  - Alertas Críticos $\rightarrow$ `import { AlertDialog, ... } from "@/components/ui/alert-dialog"`
  - Toasts $\rightarrow$ `import { toast } from "sonner"`
  - Tabelas $\rightarrow$ `import { Table, TableBody, TableCell, ... } from "@/components/ui/table"`

## 2. Utilização Correta do Helper `cn()`
- Combine classes utilitárias do Tailwind usando `@/lib/utils`:
  ```typescript
  import { cn } from "@/lib/utils";

  export function CustomCard({ className, children }: CardProps) {
    return (
      <div className={cn("rounded-lg border bg-card p-4 text-card-foreground shadow-sm", className)}>
        {children}
      </div>
    );
  }
  ```

## 3. Ergonomia Mobile & Alvos de Toque
- No chão de fábrica, operadores usam celulares e tablets.
- Garanta alvos de toque mínimos de $44 \times 44\text{ px}$ em botões de ação e checkboxes:
  - Utilize classes como `h-11 px-4 text-base touch-manipulation` para botões primários.
  - Para formulários em telas menores (`sm`), utilize o `Sheet` do shadcn ocupando a largura total (*bottom sheet* ou *full-screen*).

## 4. Integração de Formulários: `react-hook-form` + `zod`
- Valide dados com schemas Zod síncronos antes de enviar ao Axios:
  ```typescript
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";

  const formSchema = z.object({
    quantity: z.number().positive("Quantidade deve ser maior que zero"),
  });
  ```
- Desabilite o botão de submissão enquanto `formState.isSubmitting` for `true` para prevenir duplo clique acidental.
