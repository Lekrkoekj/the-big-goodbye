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
    map.require("Noodle Extensions", true);

    /// ---- { FUNCTIONS } -----

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

    /**
     * Shuffles a list of any type.
     * @param array The source list that needs to be shuffled.
     * @returns The shuffled list.
     */
    function shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // swap
        }
        return array;
    }

    /**
     * Similar to Unity's LookAt() function.
     * @param from The position of the current object that should be rotated.
     * @param to The position that should be looked at.
     * @returns A euler rotation that makes the current object look at the target.
     */
    function lookAtEuler(from: [number, number, number], to: [number, number, number]): [number, number, number] {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const dz = to[2] - from[2];
    
        const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
        const pitch = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * -180 / Math.PI;
    
        // Rotate so the font of the object faces the target instead of the bottom
        const correctedPitch = pitch + 90;
    
        return [correctedPitch, yaw, 0];
    }
    
    /**
     * Randomizes all or a specified auctioneer text object's current displayed texture.
     * @param beat The beat this event should trigger on.
     * @param index The index of the auctioneer text material that should be changed. If unspecified (-1), all materials will be randomized.
     */
    function randomizeAuctioneerTexts(beat: number, index: number = -1) {
        const materialsList = [
            materials.auctioneertext1,
            materials.auctioneertext2,
            materials.auctioneertext3,
            materials.auctioneertext4,
            materials.auctioneertext5
        ]

        if(index == -1) {
            materialsList.forEach(material => {
                material.set(map, {_CurrentTexture: rm.random(0, 12)}, beat);
            });
        }
        else if(index >= 0 && index < materialsList.length) {
            materialsList[index].set(map, {_CurrentTexture: rm.random(0, 12)}, beat);
        }
    }

    let floodingAuctioneerTextObjects: rm.InstantiatePrefab[] = [];
    /**
     * Spawns the auctioneer text objects in a grid in front of the player, used in the beginning just before the notes spawn.
     * @param beat The start beat of this event.
     * @param duration How long it should take for all text objects should be visible.
     * @param width The amount of objects that should be on the X axis.
     * @param height The amount of objects that should be on the Y axis.
     * @param spaceBetweenX How much space should be between the objects on the X axis.
     * @param spaceBetweenY How much space should be between the objects on the Y axis.
     * @param depthAmount How strong the depth difference should be in the center vs the edges.
     * @param scaleRandomizer How much the scale can be randomized negatively and positively.
     * @param positionRandomizer How much the X/Y position can be randomized negatively and positively. 
     * @param rotationRandomizer How much the rotation can be randomized negatively and positively.
     */
    function placeTextObjects(beat: number, width: number, height: number, spaceBetweenX: number = 1, spaceBetweenY: number = 1, depthAmount: number, scaleRandomizer: number, positionRandomizer: number, rotationRandomizer: number) {
        const offset: [number, number, number] = [0, 0.5, 5];
        const aimTargetPos: [number, number, number] = [0, 1.7, 0];

        const prefabsList = [
            prefabs.auctioneertext1,
            prefabs.auctioneertext2,
            prefabs.auctioneertext3,
            prefabs.auctioneertext4,
            prefabs.auctioneertext5,
        ]
    
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                // Spawn a random prefab
                let prefab = prefabsList[Math.floor(Math.random() * prefabsList.length)].instantiate(map, beat);
    
                // Grid position in the center, taking the offset, spacing and randomization into account.
                const x = (i - (width - 1) / 2) * spaceBetweenX + offset[0] + rm.random(-positionRandomizer, positionRandomizer);
                const y = j * spaceBetweenY + offset[1] + rm.random(-positionRandomizer, positionRandomizer);

                // Centered depth effect
                const gridCenterX = (width - 1) / 2;
                const gridCenterY = (height - 1) / 2;
                const distFromCenter = Math.sqrt(
                    Math.pow((i - gridCenterX) / gridCenterX, 2) +
                    Math.pow((j - gridCenterY) / gridCenterY, 2)
                );
                const centerFactor = 1 - distFromCenter;
                const z = offset[2] - centerFactor * depthAmount;
    
                // Setting the position
                const pos: [number, number, number] = [x, y, z];
                prefab.localPosition = pos;

                // Setting the scale
                const randomScale = rm.random(-scaleRandomizer, scaleRandomizer)
                prefab.scale = [0.05 + randomScale, 0.05 + randomScale, 0.05 + randomScale];
    
                // Setting the rotation facing the target, taking randomization into account.
                const look = lookAtEuler(pos, aimTargetPos);

                const randomRoll = rm.random(-rotationRandomizer, rotationRandomizer);

                prefab.localRotation = [
                    look[0],
                    look[1] + randomRoll,
                    look[2]
                ];

                // Adding to the list of objects of this event so they can be destroyed later.
                floodingAuctioneerTextObjects.push(prefab);
            }
        }
    }

    function removeTextObjects(beat: number, duration: number) {
        const shuffledTextObjects = shuffle(floodingAuctioneerTextObjects);

        let timeBetweenObjects = duration / shuffledTextObjects.length;

        let currentIndex = 0;
        for(let i = shuffledTextObjects.length - 1; i > -1; i--) {
            shuffledTextObjects[i].destroyObject(beat + timeBetweenObjects * currentIndex);
            currentIndex++;
        }
    }

    function doActioneerTextSequenceBeforeFlood() {
        let mat = materials.sideauctioneertext;
        mat.set(map, {_CurrentTexture: 0}, 15.375); // 525
        mat.set(map, {_CurrentTexture: 1}, 18.375); // will
        mat.set(map, {_CurrentTexture: 2}, 18.625); // you
        mat.set(map, {_CurrentTexture: 3}, 18.875); // give
        mat.set(map, {_CurrentTexture: 4}, 19.25); // me
        mat.set(map, {_CurrentTexture: 5}, 19.5); // 30
        mat.set(map, {_CurrentTexture: 6}, 20.25); // make
        mat.set(map, {_CurrentTexture: 7}, 20.625); // it
        mat.set(map, {_CurrentTexture: 5}, 21); // 30
        mat.set(map, {_CurrentTexture: 1}, 21.625); // will
        mat.set(map, {_CurrentTexture: 2}, 22); // you
        mat.set(map, {_CurrentTexture: 3}, 22.25); // give
        mat.set(map, {_CurrentTexture: 4}, 22.625); // me
        mat.set(map, {_CurrentTexture: 5}, 22.875); // 30
        mat.set(map, {_CurrentTexture: 1}, 23.5); // will
        mat.set(map, {_CurrentTexture: 2}, 23.875); // you
        mat.set(map, {_CurrentTexture: 3}, 24.25); // give
        mat.set(map, {_CurrentTexture: 4}, 24.5); // me
        mat.set(map, {_CurrentTexture: 8}, 24.75); // 35
        mat.set(map, {_CurrentTexture: 12}, 26.25); // 5
        mat.set(map, {_CurrentTexture: 6}, 27); // make
        mat.set(map, {_CurrentTexture: 7}, 27.375); // it
        mat.set(map, {_CurrentTexture: 9}, 27.625); // 40
        mat.set(map, {_CurrentTexture: 1}, 28.25); // will
        mat.set(map, {_CurrentTexture: 2}, 28.625); // you
        mat.set(map, {_CurrentTexture: 3}, 28.875); // give
        mat.set(map, {_CurrentTexture: 4}, 29.125); // me
        mat.set(map, {_CurrentTexture: 9}, 29.5); // 40
        mat.set(map, {_CurrentTexture: 1}, 30.125); // will
        mat.set(map, {_CurrentTexture: 2}, 30.5); // you
        mat.set(map, {_CurrentTexture: 3}, 30.75); // give
        mat.set(map, {_CurrentTexture: 4}, 31); // me
        mat.set(map, {_CurrentTexture: 10}, 31.375); // 45
        mat.set(map, {_CurrentTexture: 12}, 32.75); // 5
        mat.set(map, {_CurrentTexture: 6}, 33.375); // make
        mat.set(map, {_CurrentTexture: 7}, 33.625); // it
        mat.set(map, {_CurrentTexture: 11}, 34); // 50
        mat.set(map, {_CurrentTexture: 13}, 35); // -

        mat.set(map, {_CurrentTexture: 12}, 39); // 5
        mat.set(map, {_CurrentTexture: 13}, 39.5); // -
        mat.set(map, {_CurrentTexture: 12}, 39.625); // 5
        mat.set(map, {_CurrentTexture: 13}, 40.375); // -
        mat.set(map, {_CurrentTexture: 12}, 40.5); // 5
        mat.set(map, {_CurrentTexture: 13}, 41.125); // -
        mat.set(map, {_CurrentTexture: 12}, 41.25); // 5
        mat.set(map, {_CurrentTexture: 13}, 42); // -
    }

    function doAuctioneerTextSequence(beat: number, cutoff: number = 0) {
        let mat = materials.sideauctioneertext;
        mat.set(map, {_CurrentTexture: 0}, beat); // 525
        if(cutoff <= 4 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 1}, beat + 4); // will
        if(cutoff <= 4.5 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 2}, beat + 4.5); // you
        if(cutoff <= 5 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 3}, beat + 5); // give
        if(cutoff <= 5.5 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 4}, beat + 5.5); // me
        if(cutoff <= 6 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 5}, beat + 6); // 30
        if(cutoff <= 7.125 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 6}, beat + 7.125); // make
        if(cutoff <= 7.625 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 7}, beat + 7.625); // it
        if(cutoff <= 8.125 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 5}, beat + 8.125); // 30
        if(cutoff <= 9.125 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 1}, beat + 9.125); // will
        if(cutoff <= 9.625 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 2}, beat + 9.625); // you
        if(cutoff <= 10.125 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 3}, beat + 10.125); // give
        if(cutoff <= 10.625 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 4}, beat + 10.625); // me
        if(cutoff <= 11 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 9}, beat + 11); // 40
        if(cutoff <= 12 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 1}, beat + 12); // will
        if(cutoff <= 12.5 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 2}, beat + 12.5); // you
        if(cutoff <= 13 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 3}, beat + 13); // give
        if(cutoff <= 13.5 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 4}, beat + 13.5); // me
        if(cutoff <= 14 && cutoff != 0) { mat.set(map, {_CurrentTexture: 13}, beat + cutoff); return; };
        mat.set(map, {_CurrentTexture: 10}, beat + 14); // 45
    }

    /**
     * Linearly changes the day/night cycle of the environment.
     * @param beat The beat on which this event should start.
     * @param duration How many beats this event should take.
     * @param from The value of the day/night cycle at the beginning of the event.
     * @param to The value of the day/night cycle at the end of the event.
     * @param precision How smooth the event should look / how many custom events this should take.
     */
    function setDayNightCycle(beat: number, duration: number, from: number, to: number, precision: number) {
        precision *= duration; // make the precision not per 1 beat, but scale over the entire length of the event
        const diff = to - from;
    
        for (let t = 0; t <= duration; t += precision) {
            const progress = t / duration;
            const value = from + diff * progress;
    
            materials.skyboxmaterial.set(map, { _DayNightCycle: value }, beat + t);
            materials.lampmaterial.set(map, { _DayNightCycle: value }, beat + t);
            materials.grassplanematerial.set(map, { _DayNightCycle: value }, beat + t);
            materials.grassmaterial3.set(map, { _DayNightCycle: value }, beat + t);
            materials.treematerial1.set(map, { _DayNightCycle: value }, beat + t);
            materials.treematerial2.set(map, { _DayNightCycle: value }, beat + t);
            materials.treematerial3.set(map, { _DayNightCycle: value }, beat + t);
            materials.rockmaterial1.set(map, { _DayNightCycle: value }, beat + t);
            materials.rockmaterial2.set(map, { _DayNightCycle: value }, beat + t);
            materials.rockmaterial3.set(map, { _DayNightCycle: value }, beat + t);
            materials.rockmaterial4.set(map, { _DayNightCycle: value }, beat + t);
            materials.treetrunkmaterial.set(map, { _DayNightCycle: value }, beat + t);
            materials.bushbigmaterial.set(map, { _DayNightCycle: value }, beat + t);
            materials.bushflowermaterial.set(map, { _DayNightCycle: value }, beat + t);
            materials.bushmed2material.set(map, { _DayNightCycle: value }, beat + t);
            materials.bushmedmaterial.set(map, { _DayNightCycle: value }, beat + t); 
            materials.runwaymaterial.set(map, { _DayNightCycle: value }, beat + t); 
            materials["housematerial awning"].set(map, { _DayNightCycle: value }, beat + t); 
            materials["housematerial floor"].set(map, { _DayNightCycle: value }, beat + t); 
            materials["housematerial main"].set(map, { _DayNightCycle: value }, beat + t); 
            materials["housematerial roofline"].set(map, { _DayNightCycle: value }, beat + t); 
            materials["housematerial windows"].set(map, { _DayNightCycle: value }, beat + t); 
        }
        materials.skyboxmaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.lampmaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.grassplanematerial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.grassmaterial3.set(map, { _DayNightCycle: to }, beat + duration);
        materials.treematerial1.set(map, { _DayNightCycle: to }, beat + duration);
        materials.treematerial2.set(map, { _DayNightCycle: to }, beat + duration);
        materials.treematerial3.set(map, { _DayNightCycle: to }, beat + duration);
        materials.rockmaterial1.set(map, { _DayNightCycle: to }, beat + duration);
        materials.rockmaterial2.set(map, { _DayNightCycle: to }, beat + duration);
        materials.rockmaterial3.set(map, { _DayNightCycle: to }, beat + duration);
        materials.rockmaterial4.set(map, { _DayNightCycle: to }, beat + duration);
        materials.treetrunkmaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.bushbigmaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.bushflowermaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.bushmed2material.set(map, { _DayNightCycle: to }, beat + duration);
        materials.bushmedmaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials.runwaymaterial.set(map, { _DayNightCycle: to }, beat + duration);
        materials["housematerial awning"].set(map, { _DayNightCycle: to }, beat + duration);
        materials["housematerial floor"].set(map, { _DayNightCycle: to }, beat + duration);
        materials["housematerial main"].set(map, { _DayNightCycle: to }, beat + duration);
        materials["housematerial roofline"].set(map, { _DayNightCycle: to }, beat + duration);
        materials["housematerial windows"].set(map, { _DayNightCycle: to }, beat + duration);
    }

    function toggleUiPanels(beat: number, value: "on" | "off") {
        rm.animateTrack(map,{
            track: "uiPanelLeft",
            beat: beat,
            animation: {
                localPosition: value == "on" ? [-3, 1, 5] : [0,-1000, 0]
            }
        })
        rm.animateTrack(map,{
            track: "uiPanelRight",
            beat: beat,
            animation: {
                localPosition: value == "on" ? [3, 1, 5] : [0,-1000, 0]
            }
        })
    }

    function setLaserPositions(beat: number, side: "left" | "right") {
        let sideOffset = 3;
        let rotationOffset = 2;
        if(side == "left") {
            rm.environment(map, {
                id: "s.[0]PillarL",
                lookupMethod: "EndsWith",
                "localRotation": [
                    60,
                    -45 - rotationOffset,
                    0
                ],
                "localPosition": [
                    35 - sideOffset,
                    0,
                    5
                ]
            })
            for(let i = 1; i < 9;i++) {
                rm.environment(map, {
                    id: `s (${i}).[0]PillarL`,
                    lookupMethod: "EndsWith",
                    "localRotation": [
                        60,
                        -45 - rotationOffset * (i + 1),
                        0
                    ],
                    "localPosition": [
                        35 - sideOffset * (i + 1),
                        0,
                        5
                    ]
                })
            }
        }
        else {
            rm.environment(map, {
                id: "s.[1]PillarR",
                lookupMethod: "EndsWith",
                "localRotation": [
                    60,
                    45 + rotationOffset,
                    0
                ],
                "localPosition": [
                    -35 + sideOffset,
                    0,
                    5
                ]
            })
            for(let i = 1; i < 9;i++) {
                rm.environment(map, {
                    id: `s (${i}).[1]PillarR`,
                    lookupMethod: "EndsWith",
                    "localRotation": [
                        60,
                        45 + rotationOffset * (i + 1),
                        0
                    ],
                    "localPosition": [
                        -35 + sideOffset * (i + 1),
                        0,
                        5
                    ]
                })
            }
        }
    }

    /// ---- { ENVIRONMENT } -----

    // Skybox
    const skybox = prefabs.skybox.instantiate(map, 0);

    // Moon
    rm.environment(map, {
        id: `Moon`,
        lookupMethod: "EndsWith",
        "localPosition": [
            0,
            20,
            150
        ],
        "scale": [
            10,
            10,
            10
        ]
    });

    // Mountains
    const mountains = rm.environment(map, {
        id: "]Mountains",
        lookupMethod: "EndsWith"
    })
    mountains.scale = [0.25, 0.5, 0.25]

    // Extra Back Mountains
    const extraMountains = rm.environment(map, {
        id: "BackMountains",
        lookupMethod: "Contains",
        duplicate: 1,
        active: true
    })
    extraMountains.scale = [10,10,10];

    // Clouds
    const clouds = rm.environment(map, {
        id: "Clouds",
        lookupMethod: "EndsWith",
    })
    clouds.scale = [3, 3, 3]

    // Left UI Panel
    rm.environment(map, {
        id: "LeftPanel",
        lookupMethod: "EndsWith",
        localPosition: [-3, 1, 5],
        rotation: [0, -20, 0],
        track: "uiPanelLeft"
    })

    // Right UI Panel
    rm.environment(map, {
        id: "RightPanel",
        lookupMethod: "EndsWith",
        localPosition: [3, 1, 5],
        rotation: [0, 20, 0],
        track: "uiPanelRight"
    })

    // Assign all notes to a track
    map.allNotes.forEach(note => {
        note.track.add("allNotes")
    })

    // Apply custom note prefab to all notes
    rm.assignObjectPrefab(map, {
        colorNotes: {
            track: "allNotes",
            asset: prefabs.customnote.path,
            debrisAsset: prefabs.customnotedebris.path,
            anyDirectionAsset: prefabs.customnotedot.path
        },
        chainHeads: {
            track: "allNotes",
            asset: prefabs.customchain.path,
            debrisAsset: prefabs.customchaindebris.path
        },
        chainLinks: {
            track: "allNotes",
            asset: prefabs.customchainlink.path,
            debrisAsset: prefabs.customchainlinkdebris.path
        }
    })

    // Intro Auctioneer Side objects
    let leftAuctioneerTextIntro = prefabs.sideauctioneertext.instantiate(map, 0)
    leftAuctioneerTextIntro.localPosition = [-2.75, 1.5, 4.5]
    leftAuctioneerTextIntro.localRotation = [-270, -20, 180]
    let rightAuctioneerTextIntro = prefabs.sideauctioneertext.instantiate(map, 0)
    rightAuctioneerTextIntro.localPosition = [2.75, 1.5, 4.5]
    rightAuctioneerTextIntro.localRotation = [-270, 20, 180]

    // Static Environment Prefabs/Materials
    prefabs.runway.instantiate(map, 0);
    prefabs.grassplane.instantiate(map, 0);
    prefabs.coverart1.instantiate(map, 0);
    prefabs.coverart2.instantiate(map, 0);
    prefabs.coverart3.instantiate(map, 0);
    prefabs.coverart4.instantiate(map, 0);
    prefabs.coverart5.instantiate(map, 0);
    prefabs.coverart6.instantiate(map, 0);
    prefabs.coverart7.instantiate(map, 0);
    prefabs.house.instantiate(map, 0);
    prefabs.lampleft1.instantiate(map, 0);
    prefabs.lampleft2.instantiate(map, 0);
    prefabs.lampleft3.instantiate(map, 0);
    prefabs.lampright1.instantiate(map, 0);
    prefabs.lampright2.instantiate(map, 0);
    prefabs.lampright3.instantiate(map, 0);
    prefabs.trees.instantiate(map, 0);
    prefabs.rocks.instantiate(map, 0);
    prefabs.grass.instantiate(map, 0);
    prefabs.bushes.instantiate(map, 0);
    materials.coverart1material.set(map, {_CurrentFrame: 1}, 0); // reset cover art material to invisible first frame
    materials.auctioneertext1.set(map , {_CurrentTexture: 13}, 0); 
    materials.auctioneertext2.set(map , {_CurrentTexture: 13}, 0);
    materials.auctioneertext3.set(map , {_CurrentTexture: 13}, 0);
    materials.auctioneertext4.set(map , {_CurrentTexture: 13}, 0);
    materials.auctioneertext5.set(map , {_CurrentTexture: 13}, 0);
    materials.sideauctioneertext.set(map, {_CurrentTexture: 13}, 0);

    materials.skyboxmaterial.set(map, { _DayNightCycle: 0 }, 0); // day/night cycle
    materials.lampmaterial.set(map, { _DayNightCycle: 0 }, 0);
    materials.grassplanematerial.set(map, { _DayNightCycle: 0 }, 0);
    materials.grassmaterial3.set(map, { _DayNightCycle: 0 }, 0);
    materials.treematerial1.set(map, { _DayNightCycle: 0 }, 0);
    materials.treematerial2.set(map, { _DayNightCycle: 0 }, 0);
    materials.treematerial3.set(map, { _DayNightCycle: 0 }, 0);
    materials.rockmaterial1.set(map, { _DayNightCycle: 0 }, 0);
    materials.rockmaterial2.set(map, { _DayNightCycle: 0 }, 0);
    materials.rockmaterial3.set(map, { _DayNightCycle: 0 }, 0);
    materials.rockmaterial4.set(map, { _DayNightCycle: 0 }, 0);
    materials.treetrunkmaterial.set(map, { _DayNightCycle: 0 }, 0);
    materials.bushbigmaterial.set(map, { _DayNightCycle: 0 }, 0);
    materials.bushflowermaterial.set(map, { _DayNightCycle: 0 }, 0);
    materials.bushmed2material.set(map, { _DayNightCycle: 0 }, 0);
    materials.bushmedmaterial.set(map, { _DayNightCycle: 0 }, 0);
    materials.runwaymaterial.set(map, {_DayNightCycle: 0}, 0);
    materials["housematerial awning"].set(map, { _DayNightCycle: 0 }, 0);
    materials["housematerial floor"].set(map, { _DayNightCycle: 0 }, 0);
    materials["housematerial main"].set(map, { _DayNightCycle: 0 }, 0);
    materials["housematerial roofline"].set(map, { _DayNightCycle: 0 }, 0);
    materials["housematerial windows"].set(map, { _DayNightCycle: 0 }, 0);

    // Note shadows 
    const shadowPositions = new Set();
    map.allNotes.forEach(note => {
        // Create a unique key for this shadow position
        const key = `${note.beat}-${note.x}`;

        // If a shadow for this column & beat was already spawned → skip
        if (shadowPositions.has(key)) return;
        shadowPositions.add(key);
        let trackName = "noteShadowsFull";
        if(note.y == 1) trackName = "noteShadowsHalf"
        else if(note.y == 2) trackName = "noteShadowsFaint"
        rm.colorNote(map, {
            beat: note.beat,
            x: note.x,
            y: 0,
            track: trackName,
            fake: true,
            disableNoteLook: true,
            disableNoteGravity: true,
            spawnEffect: false,
            uninteractable: true,
            animation: {
                localRotation: [[0, 0, 0, 0]]
            }
        })
    });
    rm.assignObjectPrefab(map, {
        colorNotes: {
            track: "noteShadowsFull",
            asset: prefabs["custom note shadow full"].path,
        },
        chainHeads: {
            track: "noteShadowsFull",
            asset: prefabs["custom note shadow full"].path,
        },
        chainLinks: {
            track: "noteShadowsFull",
            asset: prefabs["custom note shadow full"].path,
        },
    })
    rm.assignObjectPrefab(map, {
        colorNotes: {
            track: "noteShadowsHalf",
            asset: prefabs["custom note shadow half"].path,
        },
        chainHeads: {
            track: "noteShadowsHalf",
            asset: prefabs["custom note shadow half"].path,
        },
        chainLinks: {
            track: "noteShadowsHalf",
            asset: prefabs["custom note shadow half"].path,
        },
    })
    rm.assignObjectPrefab(map, {
        colorNotes: {
            track: "noteShadowsFaint",
            asset: prefabs["custom note shadow faint"].path,
        },
        chainHeads: {
            track: "noteShadowsFaint",
            asset: prefabs["custom note shadow faint"].path,
        },
        chainLinks: {
            track: "noteShadowsFaint",
            asset: prefabs["custom note shadow faint"].path,
        },
    })

    // Laser positions
    setLaserPositions(0, "left");
    setLaserPositions(0, "right");

    // Top window light
    rm.geometry(map, {
        type: "Cube",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 0
            }
        },
        position: [-10.419, 6.15, 32.297],
        rotation: [-90, 0, -120.447],
        scale: [0.1629212, 3.8, 1.4861]
    })

    // Bottom window light
    rm.geometry(map, {
        type: "Cube",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 0,
            }
        },
        localPosition: [-11.244, 2, 31.84],
        rotation: [-90, 0, -120.447],
        scale: [0.1629212, 1.6, 1.4861]
    })

    // Left lantern light 1
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 1,
                lightID: 5
            }
        },
        localPosition: [-3.810996, 4.032, 6.5],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Left lantern light 2
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 6,
                lightID: 5
            }
        },
        localPosition: [-3.810996, 4.032, 13.25],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Left lantern light 3
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 7,
                lightID: 5
            }
        },
        localPosition: [-3.810996, 4.032, 20],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Right lantern light 1
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 1,
                lightID: 6
            }
        },
        localPosition: [3.810996, 4.032, 6.5],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Right lantern light 2
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 6,
                lightID: 6
            }
        },
        localPosition: [3.810996, 4.032, 13.25],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Right lantern light 3
    rm.geometry(map, {
        type: "Cylinder",
        material: {
            shader: "OpaqueLight"
        },
        components: {
            ILightWithId: {
                type: 7,
                lightID: 6
            }
        },
        localPosition: [3.810996, 4.032, 20],
        rotation: [0, 0, 0],
        scale: [0.3797671, 0.2093542, 0.3797671]
    })

    // Environment Removals
    rm.environmentRemoval(map, [
        "Rain",
        "Water",
        "LeftRail",
        "RightRail",
        "LeftFarRail",
        "RightFarRail",
        "RailingFull",
        "Curve",
        "LightRailingSegment",
        "PlayersPlace"
    ], "Contains")

    /// ---- { EVENTS } -----

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
    
    placeTextObjects(0, 15, 7, 0.5, 0.5, -2.5, 0.02, 0.1, 30);
    toggleUiPanels(0, "off");

    doActioneerTextSequenceBeforeFlood();

    randomizeAuctioneerTexts(32, 0);
    randomizeAuctioneerTexts(32.5, 1);
    randomizeAuctioneerTexts(33, 2);
    randomizeAuctioneerTexts(33.5, 3);
    randomizeAuctioneerTexts(34, 4);

    // Intro: full beat comes in, turn on cover arts
    transitionCoverArt(materials.coverart1material, 106, 0.5, "on");
    transitionCoverArt(materials.coverart2material, 106.125, 0.5, "on");
    transitionCoverArt(materials.coverart3material, 106.25, 0.5, "on");
    transitionCoverArt(materials.coverart4material, 106.375, 0.5, "on");
    transitionCoverArt(materials.coverart5material, 106.5, 0.5, "on");
    transitionCoverArt(materials.coverart6material, 106.625, 0.5, "on");
    transitionCoverArt(materials.coverart7material, 106.75, 0.5, "on");

    // Intro: auctioneer texts
    doAuctioneerTextSequence(43);
    doAuctioneerTextSequence(59);
    doAuctioneerTextSequence(75);
    doAuctioneerTextSequence(91);
    doAuctioneerTextSequence(107);
    doAuctioneerTextSequence(123, 9);
    leftAuctioneerTextIntro.destroyObject(132);
    rightAuctioneerTextIntro.destroyObject(132);

    for(let i = 34; i < 38; i += 0.25) {
        randomizeAuctioneerTexts(i);
    }
    for(let i = 38; i < 42; i += 0.125) {
        randomizeAuctioneerTexts(i);
    }

    removeTextObjects(39.5, 2.5);

    // Verse starts
    materials.sideauctioneertext.set(map, {_CurrentTexture: 13}, 139)
    toggleUiPanels(139, "on");

    // Auctioneer text during verse1
    toggleUiPanels(171, "off");
    doAuctioneerTextSequence(171, 6);
    let leftAuctioneerTextVerse = prefabs.sideauctioneertext.instantiate(map, 171)
    leftAuctioneerTextVerse.localPosition = [-2.75, 1.5, 4.5]
    leftAuctioneerTextVerse.localRotation = [-270, -20, 180]
    let rightAuctioneerTextVerse = prefabs.sideauctioneertext.instantiate(map, 171)
    rightAuctioneerTextVerse.localPosition = [2.75, 1.5, 4.5]
    rightAuctioneerTextVerse.localRotation = [-270, 20, 180]
    toggleUiPanels(177, "on");
    leftAuctioneerTextVerse.destroyObject(177);
    rightAuctioneerTextVerse.destroyObject(177);

    // Day/Night Cycles for entire song
    setDayNightCycle(75, 17, 0, 0.125, 1/50);       // Intro - full beat comes in
    setDayNightCycle(92, 10, 0.125, 0.4, 1/100);    // ^
    setDayNightCycle(102, 4, 0.4, 0.8, 1/50);       // ^
    setDayNightCycle(106.5, 0.5, 0.8, 1, 1/25);     // ^ 
    setDayNightCycle(231, 4, 1, 0, 1/50);           // Pre-Chorus 1 - song goes quieter, first chorus at night
    setDayNightCycle(393, 2, 0, 1, 1/50);           // Post-Chorus - beat comes back in, also verse 2/chorus 2 at day
    setDayNightCycle(475, 10, 1, 0.5, 1/50)         // Verse 2 - go slightly darker before chorus 2
    setDayNightCycle(488, 3, 0.5, 1, 1/25)          // Chorus 2 - go to day again for chorus 2
    setDayNightCycle(625, 2, 1, 0, 1/50)            // Bridge - quiet bridge
    setDayNightCycle(707, 43, 0, 1, 1/250)          // Bridge - very slowly get lighter until it's suddenly dark
    setDayNightCycle(750.5, 1, 1, -1, 1/25)         // Bridge/Drop - Suddenly turn pitch black
    setDayNightCycle(756, 0.5, -1, 0, 1/25)         // Drop - go to normal night
    setDayNightCycle(848, 5, 0, 1, 1/50)            // Drop/Outro - getting brighter at the end of the drop
    setDayNightCycle(921, 3, 1, -0.5, 1/50)         // End - finish at night
    
    // For more help, read: https://github.com/Swifter1243/ReMapper/wiki
}



await Promise.all([
    doMap('ExpertPlusStandard')
])

// ----------- { OUTPUT } -----------

pipeline.export({
    outputDirectory: '../OutputMaps/The Big Goodbye - AJR'
})
