import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { apiClient, extractProblemDetail } from '@/lib/api-client';

export default function App(): React.ReactElement {
  const [operatorName, setOperatorName] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);

  const handleTestToast = () => {
    toast.success('Design System Operacional', {
      description: 'Primitivos shadcn/ui e Sonner integrados com sucesso.',
    });
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    try {
      const response = await apiClient.get('/users');
      toast.success('Resposta da API', {
        description: `Status ${response.status} recebido com sucesso.`,
      });
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro RFC 7807', {
        description: detail,
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Toaster richColors position="top-right" />

      <Card className="w-full max-w-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="default">GEPF Agroindústria</Badge>
            <Badge variant="outline">Fase 1 Frontend</Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            SGMS — Design System shadcn/ui
          </CardTitle>
          <CardDescription>
            Padrão Universal Sheet ativado, alvos touch ≥ 44px e Sonner configurado.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Demonstração de Tabela & Badges */}
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Botões & Inputs</TableCell>
                  <TableCell>Alvos ≥ 44px</TableCell>
                  <TableCell>
                    <Badge variant="success">Em Conformidade</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Modais</TableCell>
                  <TableCell>Sheet Universal (Dialog Proibido)</TableCell>
                  <TableCell>
                    <Badge variant="success">Em Conformidade</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Notificações</TableCell>
                  <TableCell>Sonner Toaster</TableCell>
                  <TableCell>
                    <Badge variant="info">Ativo</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cliente HTTP</TableCell>
                  <TableCell>Axios + RFC 7807</TableCell>
                  <TableCell>
                    <Badge variant="success">Configurado</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Teste de Input Touch */}
          <div className="space-y-2">
            <label
              htmlFor="operator-input"
              className="text-sm font-medium text-foreground"
            >
              Operador de Teste
            </label>
            <Input
              id="operator-input"
              placeholder="Digite o nome do operador..."
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleTestApi}
            disabled={isTestingApi}
          >
            {isTestingApi ? 'Testando API...' : 'Testar GET /users'}
          </Button>

          <Button variant="outline" onClick={handleTestToast}>
            Disparar Toast Sonner
          </Button>

          {/* Demonstração do Sheet Universal */}
          <Sheet>
            <SheetTrigger asChild>
              <Button>Abrir Gaveta Sheet</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Painel Lateral de Operação</SheetTitle>
                <SheetDescription>
                  Este painel utiliza o padrão universal Sheet, garantindo ergonomia touch e substituindo modais flutuantes.
                </SheetDescription>
              </SheetHeader>
              <div className="py-6 text-sm text-muted-foreground">
                <p>
                  No mobile, a gaveta pode deslizar a partir da base (bottom sheet) ou da lateral (side sheet) em telas maiores.
                </p>
                {operatorName && (
                  <p className="mt-4 font-medium text-foreground">
                    Operador selecionado: {operatorName}
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </CardFooter>
      </Card>
    </div>
  );
}
