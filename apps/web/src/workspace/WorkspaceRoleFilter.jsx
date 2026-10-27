import MenuSelect from '../components/MenuSelect.jsx';
import { ROLE_NAMES } from './workspaceModels.js';

export default function WorkspaceRoleFilter({ value, onChange }) {
  return <MenuSelect className="tw-catalog-role" aria-label="模型角色" value={value} onChange={event => onChange(event.target.value)}>
    <option value="">全部角色</option>
    {Object.entries(ROLE_NAMES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
  </MenuSelect>;
}
