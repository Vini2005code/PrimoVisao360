"use client";

import {
  Facebook,
  Instagram,
  Linkedin,
  Music2,
  Share2,
  Twitter,
  Youtube,
} from "lucide-react";
import { SelectField } from "@/components/fields/SelectField";
import { TextField } from "@/components/fields/TextField";
import { FormRow } from "@/components/forms/FormRow";
import { FormSubsection } from "@/components/forms/FormSubsection";
import { AccordionFormSection } from "@/components/sections/AccordionFormSection";
import { useMetadata } from "@/shared/hooks/useMetadata";

export function AdditionalInfo() {
  const { data: referralSource = [], isLoading } =
    useMetadata("referralSource");

  return (
    <AccordionFormSection
      value="additionalInfo"
      icon={Share2}
      title="Outras informações"
    >
      <SelectField
        name="additionalInfo.referralSource"
        label="Como nos conheceu?"
        options={referralSource}
        placeholder={isLoading ? "Carregando..." : "Selecione"}
        disabled={isLoading}
      />

      <FormSubsection title="Redes sociais">
        <FormRow columns={3} gap={4}>
          <TextField
            name="additionalInfo.instagram"
            label="Instagram"
            placeholder="@usuario"
            icon={Instagram}
          />

          <TextField
            name="additionalInfo.facebook"
            label="Facebook"
            placeholder="Usuário ou link do perfil"
            icon={Facebook}
          />

          <TextField
            name="additionalInfo.linkedin"
            label="LinkedIn"
            placeholder="linkedin.com/in/seu-nome"
            icon={Linkedin}
          />
        </FormRow>

        <FormRow columns={3} gap={4}>
          <TextField
            name="additionalInfo.youtube"
            label="YouTube"
            placeholder="youtube.com/@seucanal"
            icon={Youtube}
          />

          <TextField
            name="additionalInfo.tiktok"
            label="TikTok"
            placeholder="@usuario"
            icon={Music2}
          />

          <TextField
            name="additionalInfo.xTwitter"
            label="X (Twitter)"
            placeholder="@usuario"
            icon={Twitter}
          />
        </FormRow>
      </FormSubsection>
    </AccordionFormSection>
  );
}
