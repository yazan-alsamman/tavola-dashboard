import {
  BRANCH_FEATURES,
  BRANCH_VENUE_TYPES,
  type BranchFeature,
  type BranchVenueType,
} from '@/api/branches'
import { FilterChip } from '@/components/ui/FilterChip'
import { Select } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'

interface BranchVenueFieldsProps {
  venueType: BranchVenueType | null
  features: BranchFeature[]
  disabled?: boolean
  onChange: (next: { venueType: BranchVenueType | null; features: BranchFeature[] }) => void
}

/** Backend ADR-053: what kind of place the branch is and what it offers. */
export function BranchVenueFields({ venueType, features, disabled, onChange }: BranchVenueFieldsProps) {
  const { t } = useLocale()
  const labels = t.branches.venue

  const toggle = (feature: BranchFeature) => {
    const next = features.includes(feature)
      ? features.filter((item) => item !== feature)
      : [...features, feature]
    onChange({ venueType, features: next })
  }

  return (
    <div className="space-y-3">
      <Select
        label={labels.type}
        value={venueType ?? ''}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            venueType: (e.target.value || null) as BranchVenueType | null,
            features,
          })
        }
      >
        <option value="">{labels.typeNone}</option>
        {BRANCH_VENUE_TYPES.map((type) => (
          <option key={type} value={type}>
            {labels.types[type]}
          </option>
        ))}
      </Select>
      <fieldset disabled={disabled}>
        <legend className="text-sm font-medium text-on-surface-variant mb-1.5">
          {labels.features}
        </legend>
        <div className="flex flex-wrap gap-2">
          {BRANCH_FEATURES.map((feature) => (
            <FilterChip
              key={feature}
              label={labels.featureNames[feature]}
              active={features.includes(feature)}
              onClick={() => toggle(feature)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}
