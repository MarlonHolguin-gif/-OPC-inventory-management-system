package opcback.products.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.dto.UnitRequest;
import opcback.products.dto.UnitResponse;
import opcback.products.entity.Unit;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.ProductUnitRepository;
import opcback.products.repository.UnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Unidades de medida. Igual que categorías y productos, tienen borrado lógico
 * (active) y borrado físico bloqueado si están en uso. El nombre y la
 * abreviatura son únicos (validación en esta capa, ver V14).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnitService {

    private final UnitRepository unitRepository;
    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;

    public List<UnitResponse> listAll() {
        return unitRepository.findAll().stream().map(UnitResponse::from).toList();
    }

    public UnitResponse getById(Long id) {
        return UnitResponse.from(findUnitOrThrow(id));
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        if (unitRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalStateException("Ya existe una unidad de medida con el nombre «" + request.name() + "».");
        }
        if (unitRepository.existsByAbbreviationIgnoreCase(request.abbreviation())) {
            throw new IllegalStateException(
                    "Ya existe una unidad de medida con la abreviatura «" + request.abbreviation() + "».");
        }

        Unit unit = new Unit();
        unit.setName(request.name());
        unit.setAbbreviation(request.abbreviation());
        unit.setActive(true);
        return UnitResponse.from(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findUnitOrThrow(id);

        if (unitRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new IllegalStateException("Ya existe otra unidad de medida con el nombre «" + request.name() + "».");
        }
        if (unitRepository.existsByAbbreviationIgnoreCaseAndIdNot(request.abbreviation(), id)) {
            throw new IllegalStateException(
                    "Ya existe otra unidad de medida con la abreviatura «" + request.abbreviation() + "».");
        }

        unit.setName(request.name());
        unit.setAbbreviation(request.abbreviation());
        return UnitResponse.from(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse deactivate(Long id) {
        Unit unit = findUnitOrThrow(id);
        unit.setActive(false);
        return UnitResponse.from(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse reactivate(Long id) {
        Unit unit = findUnitOrThrow(id);
        unit.setActive(true);
        return UnitResponse.from(unitRepository.save(unit));
    }

    /**
     * Borrado físico. Solo se permite si ninguna ficha de producto la usa como
     * unidad base y ninguna unidad alternativa de producto la referencia — si
     * está en uso se bloquea con el motivo y queda la opción de «Desactivar».
     */
    @Transactional
    public void delete(Long id) {
        Unit unit = findUnitOrThrow(id);

        if (productRepository.existsByBaseUnitId(id) || productUnitRepository.existsByUnitId(id)) {
            throw new IllegalStateException("No se puede eliminar la unidad «" + unit.getName()
                    + "» porque hay productos que la usan. Usa «Desactivar».");
        }

        unitRepository.delete(unit);
    }

    Unit findUnitOrThrow(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + id));
    }
}
