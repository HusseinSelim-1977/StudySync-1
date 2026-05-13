import { BakedGLTF } from './BakedGLTF'
import { CoffeeSteam } from './CoffeeSteam'

export function Room() {
  return (
    <group>
      <BakedGLTF
        glbPath="/assets/models/World/environment.glb"
        texturePath="/assets/models/World/baked_environment.jpg"
        scale={0.3}
      />
      <BakedGLTF
        glbPath="/assets/models/Computer/computer_setup.glb"
        texturePath="/assets/models/Computer/baked_computer.jpg"
        scale={0.3}
      />
      <BakedGLTF
        glbPath="/assets/models/Decor/decor.glb"
        texturePath="/assets/models/Decor/baked_decor_modified.jpg"
        scale={0.3}
      />
      <CoffeeSteam />
    </group>
  )
}
