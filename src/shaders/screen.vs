attribute vec3 aPosition;
varying vec2 vScreen;

void main () {
    gl_Position = vec4(aPosition, 1.0);
    vScreen.xy = aPosition.xy * 0.5 + 0.5;
}
