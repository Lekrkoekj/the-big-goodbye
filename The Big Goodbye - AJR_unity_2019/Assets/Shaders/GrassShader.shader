// Upgrade NOTE: replaced '_Object2World' with 'unity_ObjectToWorld'

Shader "BeatSaber/Unlit Glow Cutout Dithered Wind"
{
    Properties
    {
        _Color ("Color Day", Color) = (1,1,1,1)
        _ColorNight ("Color Night", Color) = (1,1,1,1)
        _Tex ("Texture", 2D) = "white" {}
        _Bloom ("Glow", Range (0, 1)) = 0
        _DitherMaskScale("Dither Mask Scale", Float) = 40
        _DitherMask("Dither Mask", 2D) = "black" {}
        _Alpha("Alpha", Float) = 1
        _Cutout ("Cutout", Range (0, 1)) = 0.5
        _DayNightCycle("Day/Night Cycle", Range(0, 1)) = 1

        // --- Wind / Bend controls ---
        _WindDir ("Wind Direction (world, xyz)", Vector) = (1,0,0,0)
        _WindStrength ("Wind Strength", Range(0, 0.2)) = 0.05
        _WaveSpeed ("Wave Speed", Range(0, 8)) = 2.0
        _WaveFreq ("Wave Frequency", Range(0, 8)) = 1.5
        _GustStrength ("Gust Strength", Range(0, 0.2)) = 0.03
        _GustSpeed ("Gust Speed", Range(0, 8)) = 0.8
        _GustScale ("Gust Spatial Scale", Range(0.1, 10)) = 2.0
        _TipBendPower ("Tip Bend Power", Range(0.1, 8)) = 2.5 // how sharply the tip moves vs root
        _MaxStaticBend ("Static Lean Amount", Range(0, 0.2)) = 0.03 // gentle constant lean
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" } // stays Opaque; we dither-discard instead of blending
        LOD 100
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                fixed4 color  : COLOR;     // tip/bend mask can come from color.a if you want
                float2 uv     : TEXCOORD0;

                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float2 uv     : TEXCOORD0;
                float4 scrPos : TEXCOORD1;
                float4 vertex : SV_POSITION;
                half4  color  : COLOR;

                UNITY_VERTEX_OUTPUT_STEREO
            };

            float4 _Color;
            float4 _ColorNight;
            float _Bloom;
            sampler2D _DitherMask;
            float _DitherMaskScale;
            float _Alpha;
            float _Cutout;
            float _DayNightCycle;

            sampler2D _Tex;
            float4 _Tex_ST;

            // Wind parameters
            float4 _WindDir;
            float _WindStrength;
            float _WaveSpeed;
            float _WaveFreq;
            float _GustStrength;
            float _GustSpeed;
            float _GustScale;
            float _TipBendPower;
            float _MaxStaticBend;

            v2f vert (appdata v)
            {
                v2f o;

                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                // WORLD POS (we'll do animation in world-space and then go to clip)
                float4 worldPos = mul(unity_ObjectToWorld, v.vertex);

                // ----- Tip mask: prefer UV.y; multiply by vertex color alpha if present -----
                // Make sure your grass UVs go from y=0 at root to y=1 at tip.
                float tipMask = saturate(pow(v.uv.y, _TipBendPower)) * saturate(v.color.a + 1e-5);

                // Direction & small static lean so clumps don’t look robotic
                float3 windDir = normalize(_WindDir.xyz + 1e-5);
                float3 staticLean = windDir * (_MaxStaticBend * tipMask);

                // Base wave: vary by world XZ so patches sway out of phase
                float t = _Time.y * _WaveSpeed;
                float phase = dot(worldPos.xz, float2(_WaveFreq, _WaveFreq));
                float wave = sin(t + phase);

                // Gentle second axis to avoid 1D pendulum look
                float wave2 = cos(t * 0.7 + dot(worldPos.xz, float2(_WaveFreq * 1.3, _WaveFreq * 0.8)));

                // Gusts: slower, larger scale modulation
                float gust = sin(_Time.y * _GustSpeed + dot(worldPos.xz, float2(_GustScale, _GustScale)));

                float swayAmt = (wave * 0.7 + wave2 * 0.3) * _WindStrength
                                + gust * _GustStrength;

                float3 offset = windDir * (swayAmt * tipMask) + staticLean;

                worldPos.xyz += offset;

                // Output to clip space after animation
                o.vertex = mul(UNITY_MATRIX_VP, worldPos);
                o.uv = TRANSFORM_TEX(v.uv, _Tex);
                o.color = v.color;

                // Screen pos for dither sampling
                o.scrPos = ComputeScreenPos(worldPos);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = ((_Color * _DayNightCycle) + (_ColorNight * (1 - _DayNightCycle))) * tex2D(_Tex, i.uv);

                // Alpha cutout
                if (col.a < _Cutout) discard;

                // Dithered cutout mask in screen-space (same as your original)
                float4 ase_screenPos = float4(i.scrPos.xyz, i.scrPos.w + 1e-11);
                float4 ase_screenPosNorm = ase_screenPos / ase_screenPos.w;

                if (tex2D(_DitherMask, ase_screenPosNorm.xy * _ScreenParams.xy * _DitherMaskScale).r >= _Alpha * i.color.a)
                    discard;

                // Unlit glow pipeline preserved
                col *= float4(i.color.rgb, 0.0);
                col.a = _Bloom;
                return col;
            }
            ENDCG
        }
    }
}
