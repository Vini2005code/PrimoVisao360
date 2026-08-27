package br.com.primordialdata.visao360.tenant;

import java.util.Optional;
import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_CLINIC = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setClinicId(UUID clinicId) {
        CURRENT_CLINIC.set(clinicId);
    }

    public static Optional<UUID> getClinicId() {
        return Optional.ofNullable(CURRENT_CLINIC.get());
    }

    public static UUID requireClinicId() {
        return getClinicId().orElseThrow(TenantRequiredException::new);
    }

    public static void clear() {
        CURRENT_CLINIC.remove();
    }
}
