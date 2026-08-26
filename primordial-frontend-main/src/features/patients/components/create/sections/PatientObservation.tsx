"use client";

import { FileText } from "lucide-react";
import { FormSection } from "@/components/sections/FormSection";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export function PatientObservation() {
  return (
    <FormSection
      icon={FileText}
      title="Observações do paciente"
      description="Anotações livres sobre o paciente."
    >
      <FormField
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>

            <FormControl>
              <Textarea
                {...field}
                placeholder="Digite observações gerais, preferências, restrições, histórico breve, etc."
                className="min-h-30 resize-none"
              />
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
