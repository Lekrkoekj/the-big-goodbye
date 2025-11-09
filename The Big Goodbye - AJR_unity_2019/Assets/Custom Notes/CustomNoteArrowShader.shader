Shader "Lekrkoekj/CustomObjects/CustomNoteArrow"
{
    Properties
    {
        _CutoutEdgeWidth("Cutout Edge Width", Range(0,0.1)) = 0.02

        _Texture("Texture", 2D) = "white" {}
        _TextureSize("Texture Size", Range(0.01, 10)) = 1
        _ArrowColor("Arrow Color", Color) = (1, 1, 1, 0)
        _TextureOffset("Texture Offset", Range(0, 0.5)) = 0

        /*
        _Cutout is fed in by Vivify per note.
        The other note properties (_Color, _CutPlane) are also fed in, but we're not using them here.
        */
        _Cutout ("Cutout", Range(0,1)) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing // Insert for GPU instancing
            // Ensure to check "Enable GPU Instancing" on the material

            #include "UnityCG.cginc"
            #include "Assets/VivifyTemplate/Utilities/Shader Functions/Noise.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float3 localPos : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID // Insert for GPU instancing
                UNITY_VERTEX_OUTPUT_STEREO
            };

            // Register GPU instanced properties (apply per-note)
            UNITY_INSTANCING_BUFFER_START(Props)
            UNITY_DEFINE_INSTANCED_PROP(float, _Cutout)
            UNITY_INSTANCING_BUFFER_END(Props)

            // Register regular properties (apply to every note)
            float _CutoutEdgeWidth;

            v2f vert (appdata v)
            {
                v2f o;
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_TRANSFER_INSTANCE_ID(v, o); // Insert for GPU instancing
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.vertex = UnityObjectToClipPos(v.vertex);
                o.localPos = v.vertex;

                return o;
            }

            sampler2D _Texture;
            sampler2D _ArrowColor;
            float _TextureSize;
            float _TextureOffset;

            fixed4 frag (v2f i) : SV_Target
            {

                float2 textureSize = i.localPos * _TextureSize;
                textureSize += _TextureOffset;

                UNITY_SETUP_INSTANCE_ID(i); // Insert for GPU instancing

                // Since arrows don't appear in debris, we only need to use Cutout for dissolve
                // 0 = visible, 1 = dissolved
                float Cutout = UNITY_ACCESS_INSTANCED_PROP(Props, _Cutout);

                // Calculate 3D simplex noise based on the fragment position
                float noise = simplex(i.localPos * 2);

                // Use cutout to lower the values of the noise into the negatives, clipping them
                float c = noise - Cutout;

                // Negative values of c will discard the pixel
                clip(c);

                // Positive values of c close to zero will return a border color (white)
                if (c < _CutoutEdgeWidth) {
                    return 1;
                }


                // Sample the texture
                fixed4 texCol = tex2D(_Texture, textureSize);

                // Sample the arrow color
                fixed4 arrowCol = tex2D(_ArrowColor, i.localPos);

                // Apply texture to color
                return texCol;
            }
            ENDCG
        }
    }
}
