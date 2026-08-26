import { Phone, Mail } from "lucide-react";
import { TextField } from "@/components/fields/TextField";
import { WhatsappField } from "@/components/fields/WhatsappField";
import { FormSection } from "@/components/sections/FormSection";
import { useContactMutualValidation } from "@/shared/hooks/useContactMutualValidation";
import { maskPhoneBR } from "@/shared/utils/documents/phone";

export function Contact() {
  useContactMutualValidation();

  return (
    <FormSection
      icon={Phone}
      title="Contato"
      description="Informações para comunicação com o paciente"
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <WhatsappField name="whatsapp" className="md:col-span-3" />

          <TextField
            name="phone"
            label="Telefone/Celular"
            icon={Phone}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="tel"
            transform={maskPhoneBR}
            className="md:col-span-3"
          />

          <TextField
            name="email"
            label="E-mail"
            icon={Mail}
            placeholder="exemplo@email.com"
            inputMode="email"
            autoComplete="email"
            transform={(v) => v.trim().toLowerCase()}
            className="md:col-span-6"
          />
        </div>
      </div>
    </FormSection>
  );
}
