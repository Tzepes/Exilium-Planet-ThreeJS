varying vec3 vNormal;

void main() {
    float intensity = pow(0.3 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);

    //gl_FragColor = vec4(atmosphere + texture2D(planetTexture, vUv).xyz, 1.0);
    gl_FragColor = vec4(0.3, 0.2, 0.1, 1.0) * intensity;
}