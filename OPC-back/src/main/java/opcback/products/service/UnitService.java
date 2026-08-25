package opcback.products.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.dto.UnitRequest;
import opcback.products.dto.UnitResponse;
import opcback.products.entity.Unit;
import opcback.products.repository.UnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ma_units no tiene columna "active" en el DDL — no hay concepto de
 * desactivación para unidades de medida, solo crear/editar/listar.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnitService {

    private final UnitRepository unitRepository;

    public List<UnitResponse> listAll() {
        return unitRepository.findAll().stream().map(UnitResponse::from).toList();
    }

    public UnitResponse getById(Long id) {
        return UnitResponse.from(findUnitOrThrow(id));
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        Unit unit = new Unit();
        unit.setName(request.name());
        unit.setAbbreviation(request.abbreviation());
        return UnitResponse.from(unitRepository.save(unit));
    }

    @Transactional
    public UnitResponse update(Long id, UnitRequest request) {
        Unit unit = findUnitOrThrow(id);
        unit.setName(request.name());
        unit.setAbbreviation(request.abbreviation());
        return UnitResponse.from(unitRepository.save(unit));
    }

    Unit findUnitOrThrow(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + id));
    }
}
