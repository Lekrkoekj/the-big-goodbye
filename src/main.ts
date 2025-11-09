import * as rm from "https://deno.land/x/remapper@4.2.0/src/mod.ts"
import * as bundleInfo from '../bundleinfo.json' with { type: 'json' }
import { Material } from "jsr:@3d/three";

const pipeline = await rm.createPipeline({ bundleInfo })

const bundle = rm.loadBundle(bundleInfo)
const materials = bundle.materials
const prefabs = bundle.prefabs

// ----------- { SCRIPT } -----------

async function doMap(file: rm.DIFFICULTY_NAME) {
    const map = await rm.readDifficultyV3(pipeline, file)

    map.require("Vivify", true);
    map.suggest("Chroma", true);

    // FUNCTIONS

    // beat 15, duration 3
    /**
     * Transitions a material that has uses the CoverArtShader on/off on the specified beat over the specified duration.
     * @param material The material that should be changed.
     * @param beat The start beat on which this transition should start.
     * @param duration The duration of this transition.
     * @param direction Transition on or off.
     */
    function transitionCoverArt(material: rm.Material, beat: number, duration: number, direction: 'on' | 'off') {
        const frameAmount = 15;
    
        for (let i = 0; i < frameAmount; i++) {
            const progress = i / (frameAmount - 1);
            const time = beat + duration * progress;
    
            // Determine frame based on direction
            const frame =
                direction === 'on'
                    ? 1 + i
                    : frameAmount - i;
    
            material?.set(map, { _CurrentFrame: frame }, time);
        }
    }

    // Skybox
    const skybox = prefabs.skybox.instantiate(map, 0);

    // Mountains
    const mountains = rm.environment(map, {
        id: "]Mountains",
        lookupMethod: "EndsWith"
    })
    mountains.scale = [0.25, 0.5, 0.25]

    // Assign all notes to a track
    map.allNotes.forEach(note => {
        note.track.add("myColorNotes")
    })

    // Apply custom note prefab to all notes
    rm.assignObjectPrefab(map, {
        colorNotes: {
            track: "myColorNotes",
            asset: prefabs.customnote.path
        }
    })

    // Static Environment Prefabs/Materials
    prefabs.runway.instantiate(map, 0); // Floor
    prefabs.grassplane.instantiate(map, 0); // Grass Plane
    prefabs.coverart1.instantiate(map, 0); // Cover Art 1
    materials.coverart1material.set(map, {_CurrentFrame: 1}, 0); // Cover Art 1 material

    // Environment Enhancements
    rm.environmentRemoval(map, [
        "Rain",
        "Water",
        "LeftRail",
        "RightRail",
        "LeftFarRail",
        "RightFarRail",
        "RailingFull",
        "Curve"
    ])

    // Intro: AJR logo
    const ajrLogo = prefabs.ajrlogo.instantiate(map, {
        beat: 6,
        track: "AJRLogo",
        scale: [0, 0, 0],
    })
    rm.animateTrack(map, {
        beat: 6,
        duration: 9,
        track: "AJRLogo",
        animation: {
            position: [
                [0, 1.5, 7, 0],
                [0, 1.75, 7, 0.11, "easeOutBack"],
                [0, 1.875, 5.75, 1]
            ],
            scale: [
                [0, 0, 0, 0],
                [0.1058433, 0.1058433, 0.1058433, 0.11],
                [0.1058433, 0.1058433, 0.1058433, 0.75],
                [0, 0, 0, 1]
            ],
            rotation: [
                [-270, 0, 180, 0],
                [-270, 0, 180, 0.8],
                [-630, -180, 180, 0.95]
            ]
        }
    });
    ajrLogo.destroyObject(15);

    transitionCoverArt(materials.coverart1material, 8, 1, "on");
    // transitionCoverArt(materials.coverart1material, 22, 2, "off");

    // Intro: The Big Goodbye text
    const tbgText = prefabs.thebiggoodbyetext.instantiate(map, {
        beat: 7,
        track: "TBGText",
        scale: [0, 0, 0]
    }) // AJR Logo

    // AJR logo animation
    rm.animateTrack(map, {
        beat: 7,
        duration: 8,
        track: "TBGText",
        animation: {
            position: [
                [0, 0.75, 7, 0],
                [0, 1.032, 7, 0.11, "easeOutBack"],
                [0, 1.25, 5.75, 1]
            ],
            scale: [
                [0, 0, 0, 0],
                [0.01, 0.01, 0.01, 0.11],
                [0.01, 0.01, 0.01, 0.8],
                [0, 0, 0, 1]
            ],
            rotation: [
                [0, 0, 0, 0],
                [0, 0, 0, 0.9],
                [0, -180, 0, 0.95]
            ]
        }
    });



    // const auctioneerText1 = prefabs.auctioneertext.instantiate(map, 0);

    // materials.trasnsparenttextmaterial.set(
    //     map,
    //     {
    //         _CurrentTexture: 1
    //     },
    //     2
    // )


    /* // Test Animation
    rm.animateTrack(map, {
        beat: 12,
        duration: 4,
        repeat: 2,
        track: "spheres",
        animation: {
            localPosition: [
                [0, 0, 0, 0],
                [1, 0, 1, 0.25],
                [0, 1, 1, 0.5],
                [1, 0, 0, 0.75],
                [0, 0, 0, 1]
            ]
        }
    })

    // Test Object
    const sphere1 = prefabs.testsphere.instantiate(map, {
        beat: 8,
        track: "spheres",
        localPosition: [1, 1, 1],

    }); */

    // const sphere2 = prefabs.testsphere.instantiate(map, 8);
    // sphere2.track.add("spheres");

    // Example: Run code on every note!

    // map.allNotes.forEach(note => {
    //     console.log(note.beat)
    // })

    // For more help, read: https://github.com/Swifter1243/ReMapper/wiki
}



await Promise.all([
    doMap('ExpertPlusStandard')
])

// ----------- { OUTPUT } -----------

pipeline.export({
    outputDirectory: '../OutputMaps/The Big Goodbye - AJR'
})
