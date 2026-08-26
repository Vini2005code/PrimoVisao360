import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  isValidPhoneBR,
  isValidWhatsappBR,
} from "@/shared/utils/documents/phone";

export function useContactMutualValidation() {
  const { clearErrors, trigger } = useFormContext();

  const whatsapp = useWatch({ name: "whatsapp" });
  const phone = useWatch({ name: "phone" });

  useEffect(() => {
    const whatsappOk = isValidWhatsappBR(whatsapp);
    const phoneOk = isValidPhoneBR(phone);

    if (whatsappOk) clearErrors("phone");
    if (phoneOk) clearErrors("whatsapp");

    if (whatsappOk || phoneOk) {
      void trigger(["whatsapp", "phone"]);
    }
  }, [whatsapp, phone, clearErrors, trigger]);
}
