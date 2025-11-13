Shader "Custom/MultiplyShadowProcedural"
{
    Properties
    {
        _Color    ("Tint (RGB only)", Color) = (1,1,1,0)
        _Darkness ("Center Darkness", Range(0,1)) = 0.6
        _Center   ("Center (UV)", Vector) = (0.5, 0.5, 0, 0)
        _Radius   ("Radius (UV xy)", Vector) = (0.35, 0.2, 0, 0)
        _Softness ("Edge Softness", Range(0.0001, 1)) = 0.25
        _Rotate   ("Rotation (deg)", Range(-180,180)) = 0
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend DstColor Zero
        ZWrite Off
        Cull Off
        Lighting Off
        Fog { Mode Off }

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing      // <-- add this

            #include "UnityCG.cginc"

            float4 _Color;
            float  _Darkness;
            float4 _Center;
            float4 _Radius;
            float  _Softness;
            float  _Rotate;

            struct appdata {
                float4 vertex : POSITION;
                float2 uv     : TEXCOORD0;

                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f {
                float4 pos : SV_POSITION;
                float2 uv  : TEXCOORD0;

                UNITY_VERTEX_OUTPUT_STEREO
            };

            v2f vert (appdata v) {
                v2f o;

                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv  = v.uv;
                return o;
            }

            float2 rot2(float2 p, float aRad) {
                float s = sin(aRad), c = cos(aRad);
                return float2(c*p.x - s*p.y, s*p.x + c*p.y);
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float2 p = i.uv - _Center.xy;
                p = rot2(p, radians(_Rotate));
                float2 q = float2(p.x / max(_Radius.x, 1e-5), p.y / max(_Radius.y, 1e-5));

                float d = length(q);

                float edge0 = 1.0 - _Softness;
                float edge1 = 1.0;
                float mask = 1.0 - saturate((d - edge0) / max(edge1 - edge0, 1e-5));

                float m = 1.0 - _Darkness * mask;
                float3 mulRGB = m * _Color.rgb;

                return float4(mulRGB, 0);
            }
            ENDCG
        }
    }
}
