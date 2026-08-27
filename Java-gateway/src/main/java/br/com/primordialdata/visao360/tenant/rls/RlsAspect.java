package br.com.primordialdata.visao360.tenant.rls;

import br.com.primordialdata.visao360.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import java.lang.reflect.UndeclaredThrowableException;
import java.util.UUID;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Aspect
@Component
public class RlsAspect {

    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;
    private final boolean rlsEnabled;

    public RlsAspect(
            EntityManager entityManager,
            PlatformTransactionManager transactionManager,
            @Value("${app.rls.enabled:false}") boolean rlsEnabled
    ) {
        this.entityManager = entityManager;
        this.transactionManager = transactionManager;
        this.rlsEnabled = rlsEnabled;
    }

    @Around("@annotation(clinicRls)")
    public Object executeInsideTenantTransaction(
            ProceedingJoinPoint joinPoint,
            ClinicRls clinicRls
    ) {
        UUID clinicId = TenantContext.requireClinicId();
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
        transactionTemplate.setReadOnly(clinicRls.readOnly());
        return transactionTemplate.execute(status -> {
            if (rlsEnabled) {
                entityManager.createNativeQuery(
                                "select set_config('app.current_clinic_id', :clinicId, true)"
                        )
                        .setParameter("clinicId", clinicId.toString())
                        .getSingleResult();
            }
            try {
                return joinPoint.proceed();
            } catch (RuntimeException | Error exception) {
                throw exception;
            } catch (Throwable throwable) {
                throw new UndeclaredThrowableException(throwable);
            }
        });
    }
}
