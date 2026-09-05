import { DoubleSide, MeshLambertMaterial, PlaneGeometry } from 'three';

/** UV coordinates survive the organic shape so the same mesh can settle into a square. */
export function foliageGeometry(kind: 'grass' | 'leaf') {
  const geometry = new PlaneGeometry(1, 1, kind === 'leaf' ? 16 : 2, kind === 'leaf' ? 8 : 12);
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (kind === 'grass') {
      positions.setXYZ(i, (u - .5) * (1 - v * .985) + .27 * v * v,
        v, .12 * v * v + .025 * Math.sin(u * Math.PI));
    } else {
      const angle = (u - .5) * 2.5;
      const edge = 1 - .13 * Math.exp(-angle * angle * 90) + .025 * Math.cos(u * Math.PI * 24);
      const radius = .025 + v * (.975 + (edge - 1) * Math.pow(v, 5));
      positions.setXYZ(i, Math.sin(angle) * radius * .68, Math.cos(angle) * radius - .48,
        .11 * Math.sin(angle * 2) * v * v + .065 * Math.cos(u * Math.PI * 8) * v + .08 * v * v);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function foliageMaterial(kind: 'grass' | 'leaf') {
  const material = new MeshLambertMaterial({ side: DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float reveal; varying float vReveal; varying vec2 vOrganicUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vOrganicUv = uv;
      vReveal = reveal;
      transformed = mix(transformed, vec3(uv - .5, 0.0), reveal);
    `);
    shader.fragmentShader = 'varying float vReveal; varying vec2 vOrganicUv;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 organic = vOrganicUv;
      ${kind === 'grass' ? `
        float fiber = .5 + .5 * sin(organic.x * 43.0 + sin(organic.y * 13.0));
        float ridge = exp(-pow((organic.x - .5) * 20.0, 2.0));
        float detail = .67 + .28 * organic.y + .08 * fiber + .09 * ridge;
      ` : `
        float vein = pow(.5 + .5 * cos(organic.x * 125.6637), 18.0);
        float fineVein = pow(.5 + .5 * cos(organic.x * 251.3274 + organic.y * 2.0), 24.0);
        float mottling = sin(organic.x * 67.0 + sin(organic.y * 31.0)) * sin(organic.y * 83.0);
        float detail = .85 + .13 * organic.y - .10 * vein - .045 * fineVein + .04 * mottling;
      `}
      outgoingLight = mix(outgoingLight * detail, diffuseColor.rgb, vReveal);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => `autumn-square-${kind}-v1`;
  return material;
}

export function barkMaterial(color: string) {
  const material = new MeshLambertMaterial({ color, transparent: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vBarkUv;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBarkUv = uv;');
    shader.fragmentShader = 'varying vec2 vBarkUv;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float along = vBarkUv.x;
      float around = vBarkUv.y;
      float warp = .018 * sin(along * 45.0) + .009 * sin(along * 113.0);
      float furrow = pow(.5 + .5 * sin((around + warp) * 100.53), 14.0);
      float grain = .5 + .5 * sin(around * 320.0 + sin(along * 91.0) * 2.0);
      vec2 knot = vec2((along - .28) * 28.0, sin((around - .35) * 3.14159) * 8.0);
      float knotRing = exp(-dot(knot, knot) * .7) * (.5 + .5 * sin(length(knot) * 21.0));
      outgoingLight *= .88 + .17 * grain - .32 * furrow - .19 * knotRing;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'autumn-bark-v1';
  return material;
}
