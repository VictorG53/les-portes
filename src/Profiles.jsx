import { Save, Undo2 } from 'lucide-react'
import { play } from './sound'
import Tip, { Text } from './Tip'

// équipements enregistrés : on garde la composition du sac d'or et des talismans, pour en changer en un clic
// (par exemple un profil « revenu » et un profil « prix des portes »)
export default function Profiles({ profiles, onSave, onLoad }) {
  return (
    <div className="profiles">
      <span className="muted">Profils d'équipement</span>
      {profiles.map((p, i) => (
        <div key={i} className="profile">
          <b>{i + 1}</b>
          <Tip content={<Text title={`Enregistrer le profil ${i + 1}`}>Mémorise le sac d'or et les talismans actuellement équipés.{p ? ' Remplace le profil existant.' : ''}</Text>}>
            <button
              className="btn small ghost icon-btn"
              aria-label={`Enregistrer le profil ${i + 1}`}
              onClick={() => {
                onSave(i)
                play('equip')
              }}
            >
              <Save size={14} strokeWidth={2.25} />
            </button>
          </Tip>
          <Tip content={<Text title={`Charger le profil ${i + 1}`}>{p ? 'Rééquipe ce profil (les objets que tu ne possèdes plus sont ignorés).' : 'Aucun profil enregistré.'}</Text>}>
            <button
              className="btn small ghost icon-btn"
              disabled={!p}
              aria-label={`Charger le profil ${i + 1}`}
              onClick={() => {
                onLoad(i)
                play('equip')
              }}
            >
              <Undo2 size={14} strokeWidth={2.25} />
            </button>
          </Tip>
        </div>
      ))}
    </div>
  )
}
