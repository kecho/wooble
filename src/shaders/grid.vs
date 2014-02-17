attribute vec3 aPosition;

uniform mat4 uViewProj;

void main () {
    vec4 projPos = uViewProj * vec4(aPosition, 1.0); 
    gl_Position = projPos;
}
