import { useCatalogStore } from '../features/catalog/catalogStore.ts';

export function useCatalog() {
  const store = useCatalogStore();

  const activeTypes = store.types.filter((t) => t.is_active);
  const inactiveTypes = store.types.filter((t) => !t.is_active);

  const selectedType = store.types.find((t) => t.id === store.selectedTypeId) || store.types[0] || null;
  const selectedRequirements = selectedType
    ? store.requirements.filter((r) => r.application_type_id === selectedType.id)
    : [];

  const mandatoryCount = selectedRequirements.filter((r) => r.is_mandatory).length;
  const subsanableCount = selectedRequirements.filter((r) => r.is_subsanable).length;
  const nonSubsanableCount = selectedRequirements.filter((r) => !r.is_subsanable).length;

  return {
    ...store,
    activeTypes,
    inactiveTypes,
    selectedType,
    selectedRequirements,
    stats: {
      totalTypes: store.types.length,
      activeTypesCount: activeTypes.length,
      totalRequirements: store.requirements.length,
      selectedMandatory: mandatoryCount,
      selectedSubsanable: subsanableCount,
      selectedNonSubsanable: nonSubsanableCount,
    },
  };
}
