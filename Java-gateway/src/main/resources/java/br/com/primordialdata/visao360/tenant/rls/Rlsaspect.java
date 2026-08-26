package br.com.primordialdata.visao360.tenant.rls;

import br.com.primordialdata.visao360.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class RlsAspect {

    // O EntityManager é a ferramenta oficial do Java para enviar comandos diretos ao banco
    private final EntityManager entityManager;

    public RlsAspect(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // Esta anotação é a mágica do AOP. 
    // Ela diz: "Antes (@Before) de executar qualquer método dentro da pasta repository, rode este código".
    @Before("execution(* br.com.primordialdata.visao360.domain.repository..*(..))")
    public void activateRowLevelSecurity() {
        
        // 1. Pegamos o ID da clínica que foi guardado pelo nosso TenantFilter
        String clinicId = TenantContext.getClinicId();

        if (clinicId != null) {
            // 2. Enviamos o comando nativo para o PostgreSQL.
            // O "SET LOCAL" é uma funcionalidade nativa do Postgres que dura APENAS 
            // durante a transação atual. Quando a consulta acaba, a variável some do banco.
            // Isso garante que uma consulta não contamine a próxima.
            String sql = "SET LOCAL app.current_clinic_id = '" + clinicId + "'";
            entityManager.createNativeQuery(sql).executeUpdate();
        }
    }
}