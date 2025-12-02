Shader "Lekrkoekj/CoverArtShader"
{
    Properties
    {
        _Multiplier("Color Multiplier", Range(0,3)) = 1
        _CurrentFrame("Current Frame", Range(1,15)) = 1
        _RotationStrength("Rotation Strength", float) = 0
        _RotationSpeed("Rotation Speed", float) = 0

        _Frame("Texture", 2D) = "white" {}

        // Mask animation frames
        _Mask1 ("Mask 1", 2D) = "white" {}
        _Mask2 ("Mask 2", 2D) = "white" {}
        _Mask3 ("Mask 3", 2D) = "white" {}
        _Mask4 ("Mask 4", 2D) = "white" {}
        _Mask5 ("Mask 5", 2D) = "white" {}
        _Mask6 ("Mask 6", 2D) = "white" {}
        _Mask7 ("Mask 7", 2D) = "white" {}
        _Mask8 ("Mask 8", 2D) = "white" {}
        _Mask9 ("Mask 9", 2D) = "white" {}
        _Mask10("Mask 10", 2D) = "white" {}
        _Mask11("Mask 11", 2D) = "white" {}
        _Mask12("Mask 12", 2D) = "white" {}
        _Mask13("Mask 13", 2D) = "white" {}
        _Mask14("Mask 14", 2D) = "white" {}
        _Mask15("Mask 15", 2D) = "white" {}
    }

    SubShader
    {
        Tags {
            "Queue" = "Transparent"
            "RenderType" = "Transparent"
        }

        Blend One OneMinusSrcColor
        ZWrite Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata {
                float4 vertex : POSITION;
                float2 uv     : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f {
                float2 uv     : TEXCOORD0;
                float4 vertex : SV_POSITION;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            // Properties
            sampler2D _Frame;
            float4 _Frame_ST;

            float _Multiplier;
            float _CurrentFrame;
            float _Rotation;
            float _RotationStrength;
            float _RotationSpeed;

            // mask frames
            sampler2D _Mask1;
            sampler2D _Mask2;
            sampler2D _Mask3;
            sampler2D _Mask4;
            sampler2D _Mask5;
            sampler2D _Mask6;
            sampler2D _Mask7;
            sampler2D _Mask8;
            sampler2D _Mask9;
            sampler2D _Mask10;
            sampler2D _Mask11;
            sampler2D _Mask12;
            sampler2D _Mask13;
            sampler2D _Mask14;
            sampler2D _Mask15;

            v2f vert(appdata v)
            {
                UNITY_SETUP_INSTANCE_ID(v);

                _Rotation = sin(_Time.x * 100 * _RotationSpeed) * 25 * _RotationStrength;

                v2f o;
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                float rad = radians(_Rotation);

                float3x3 rotZ = float3x3(
                    cos(rad),   0,  sin(rad),
                    0,          1,  0,
                    -sin(rad),  0,  cos(rad)
                );

                float3 offset = float3(
                    sin(_Time.x * 100 * _RotationSpeed) * 1 * _RotationStrength,
                    sin(_Time.x * 100 * _RotationSpeed) * 0.5 * _RotationStrength,
                    cos(_Time.x * 100 * _RotationSpeed) * 3 * _RotationStrength
                );

                float3 pos = mul(rotZ, v.vertex.xyz + offset);

                o.vertex = UnityObjectToClipPos(float4(pos, 1));
                o.uv = TRANSFORM_TEX(v.uv, _Frame);

                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                fixed4 baseColor = tex2D(_Frame, i.uv);

                float f = floor(_CurrentFrame);

                fixed mask = tex2D(_Mask1, i.uv).r;
                if (f == 2) mask = tex2D(_Mask2, i.uv).r;
                if (f == 3) mask = tex2D(_Mask3, i.uv).r;
                if (f == 4) mask = tex2D(_Mask4, i.uv).r;
                if (f == 5) mask = tex2D(_Mask5, i.uv).r;
                if (f == 6) mask = tex2D(_Mask6, i.uv).r;
                if (f == 7) mask = tex2D(_Mask7, i.uv).r;
                if (f == 8) mask = tex2D(_Mask8, i.uv).r;
                if (f == 9) mask = tex2D(_Mask9, i.uv).r;
                if (f == 10) mask = tex2D(_Mask10, i.uv).r;
                if (f == 11) mask = tex2D(_Mask11, i.uv).r;
                if (f == 12) mask = tex2D(_Mask12, i.uv).r;
                if (f == 13) mask = tex2D(_Mask13, i.uv).r;
                if (f == 14) mask = tex2D(_Mask14, i.uv).r;
                if (f == 15) mask = tex2D(_Mask15, i.uv).r;

                // Apply mask by multiplying RGB
                baseColor.rgb *= mask * _Multiplier;

                baseColor.a = 0;

                return baseColor;
            }

            ENDCG
        }
    }
}
