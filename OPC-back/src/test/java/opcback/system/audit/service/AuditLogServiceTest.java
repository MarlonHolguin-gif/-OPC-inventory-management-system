package opcback.system.audit.service;

import opcback.products.entity.Category;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import opcback.system.audit.dto.AuditLogResponse;
import opcback.system.audit.entity.AuditAction;
import opcback.system.audit.entity.AuditLog;
import opcback.system.audit.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Vista de auditoría: resolución del nombre legible del producto
 * ("Nombre (SKU)") y de las asociaciones que se guardan como id
 * ("baseUnit: 4" -> "baseUnit: Litro (lt)") — antes solo se veían números.
 */
@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private UnitRepository unitRepository;

    private AuditLogService auditLogService() {
        return new AuditLogService(
                jdbcTemplate, objectMapper, auditLogRepository, productRepository, categoryRepository, unitRepository);
    }

    private static AuditLog log(String oldValuesJson, String newValuesJson) {
        AuditLog log = new AuditLog();
        log.setId(1L);
        log.setEntity("Product");
        log.setEntityId(5L);
        log.setAction(AuditAction.UPDATE);
        log.setOldValues(oldValuesJson);
        log.setNewValues(newValuesJson);
        log.setEventDate(LocalDateTime.now());
        return log;
    }

    private static Product product() {
        Product product = new Product();
        product.setId(5L);
        product.setName("Gaseosa Cola 1.5L");
        product.setSku("BEB-002");
        return product;
    }

    private static Unit unit(Long id, String name, String abbreviation) {
        Unit unit = new Unit();
        unit.setId(id);
        unit.setName(name);
        unit.setAbbreviation(abbreviation);
        return unit;
    }

    @Test
    @SuppressWarnings("unchecked")
    void resuelveElNombreYSkuDelProductoAunSiElRegistroSoloTraeElPrecio() {
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log(null, "{\"referencePrice\":3000}"))));
        when(productRepository.findAllById(any())).thenReturn(List.of(product()));

        Page<AuditLogResponse> page = auditLogService().search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getContent()).singleElement()
                .extracting(AuditLogResponse::entityLabel)
                .isEqualTo("Gaseosa Cola 1.5L (BEB-002)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void siElProductoYaNoExisteCaeAlNombreGuardadoEnElPropioRegistro() {
        String json = "{\"name\":\"Gaseosa Cola 1.5L\",\"sku\":\"BEB-002\"}";
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log(null, json))));
        when(productRepository.findAllById(any())).thenReturn(List.of());
        when(objectMapper.readValue(json, Object.class))
                .thenReturn(Map.of("name", "Gaseosa Cola 1.5L", "sku", "BEB-002"));

        Page<AuditLogResponse> page = auditLogService().search(null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getContent()).singleElement()
                .extracting(AuditLogResponse::entityLabel)
                .isEqualTo("Gaseosa Cola 1.5L (BEB-002)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void traduceElIdDeLaUnidadBaseANombreLegibleEnElDiff() {
        String oldJson = "{\"baseUnit\":4}";
        String newJson = "{\"baseUnit\":103}";
        when(auditLogRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log(oldJson, newJson))));
        lenient().when(productRepository.findAllById(any())).thenReturn(List.of(product()));
        when(objectMapper.readValue(oldJson, Object.class)).thenReturn(Map.of("baseUnit", 4));
        when(objectMapper.readValue(newJson, Object.class)).thenReturn(Map.of("baseUnit", 103));
        when(unitRepository.findAllById(any()))
                .thenReturn(List.of(unit(4L, "Litro", "lt"), unit(103L, "Caja", "Cj")));

        Page<AuditLogResponse> page = auditLogService().search(null, null, null, null, null, PageRequest.of(0, 20));

        AuditLogResponse row = page.getContent().get(0);
        assertThat((Map<String, Object>) row.oldValues()).containsEntry("baseUnit", "Litro (lt)");
        assertThat((Map<String, Object>) row.newValues()).containsEntry("baseUnit", "Caja (Cj)");
    }
}
