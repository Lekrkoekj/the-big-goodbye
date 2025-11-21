Shader "Vivify/SkyboxShader"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (1, 1, 1)
        _HorizonColor ("Horizon Color", Color) = (1, 1, 1)
        _BaseColorNight ("Base Color", Color) = (1, 1, 1)
        _HorizonColorNight ("Horizon Color", Color) = (1, 1, 1)
        _HorizonBlend ("Horizon Blend", Float) = 4
        _HorizonHeight ("Horizon Height", Float) = 0
        _Bloom ("Bloom", Range(0, 1)) = 1
        _DayNightCycle("Day/Night Cycle", Range(0, 1)) = 1

        _NormalMap ("Normal Map", 2D) = "bump" {} // 🆕 normal map property
        _NormalStrength ("Normal Strength", Range(0, 1)) = 0.5 // 🆕 normal intensity
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Cull Front // Render only the back faces

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float3 localPosition : TEXCOORD0;
                float2 uv : TEXCOORD1;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            float3 _BaseColor;
            float3 _HorizonColor;
            float3 _BaseColorNight;
            float3 _HorizonColorNight;
            float _HorizonBlend;
            float _HorizonHeight;
            float _Bloom;
            float _DayNightCycle;

            sampler2D _NormalMap;
            float _NormalStrength;

            v2f vert (appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.vertex = UnityObjectToClipPos(v.vertex);
                o.localPosition = v.vertex.xyz;
                o.uv = v.uv;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float3 up = float3(0, 1, 0);
                float3 forward = normalize(i.localPosition);

                // --- NORMAL MAP (tangent-space style perturbation) ---
                float3 normalTex = UnpackNormal(tex2D(_NormalMap, i.uv));
                normalTex = normalize(lerp(float3(0, 0, 1), normalTex, _NormalStrength));

                // Use the normal map to slightly distort the 'up' direction
                up = normalize(up + normalTex * _NormalStrength * 0.5);

                // Convert dot product to [0,1]
                float height = saturate((dot(forward, up) * 0.5) + 0.5);

                // Smooth horizon transition
                float blend = smoothstep(_HorizonHeight - (1.0 / _HorizonBlend),
                                         _HorizonHeight + (1.0 / _HorizonBlend),
                                         height);

                // Blend between top and bottom colors
                float3 skyColor = lerp((_BaseColor * _DayNightCycle) + ((_BaseColorNight * (1 - _DayNightCycle))), (_HorizonColor * _DayNightCycle) + (_HorizonColorNight * (1 - _DayNightCycle)), blend);

                return float4(skyColor, _Bloom);
            }
            ENDCG
        }
    }
}
