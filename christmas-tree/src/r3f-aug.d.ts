import type { ShaderMaterial } from 'three'
import type { Object3DNode } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      foliageMaterial: Object3DNode<ShaderMaterial, typeof ShaderMaterial>
    }
  }
}
