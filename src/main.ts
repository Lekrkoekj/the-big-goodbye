import * as rm from "https://deno.land/x/remapper@4.2.0/src/mod.ts"
import * as bundleInfo from '../bundleinfo.json' with { type: 'json' }

const pipeline = await rm.createPipeline({ bundleInfo })

const bundle = rm.loadBundle(bundleInfo)
const materials = bundle.materials
const prefabs = bundle.prefabs

// ----------- { SCRIPT } -----------

async function doMap(file: rm.DIFFICULTY_NAME, chromaOnly: boolean = false) {
    const map = await rm.readDifficultyV3(pipeline, file)

    console.log("Chroma only: " + chromaOnly);

    if(!chromaOnly) map.require("Vivify", true);
    map.suggest("Chroma", true);
    if(!chromaOnly) map.require("Noodle Extensions", true);

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
     * An easy way to transition all cover arts with a specified delay between them.
     * @param beat The beat this event should trigger on.
     * @param offset The amount of delay (in beats) there should be between each cover art.
     * @param duration The amount of time each cover art should take to transition.
     * @param direction Transition on or off.
     */
    function transitionAllCoverArt(beat: number, offset: number, duration: number, direction: "on" | "off") {
        const materialsList = [
            materials.coverart5material,
            materials.coverart1material,
            materials.coverart2material,
            materials.coverart3material,
            materials.coverart6material,
            materials.coverart7material,
            materials.coverart4material,
        ]
        for(let i = 0; i < materialsList.length; i++) {
            transitionCoverArt(materialsList[i], beat + offset * i, duration, direction);
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

    /**
     * Remove the text objects of the text flooding sequence in the intro.
     * @param beat When this event should happen.
     * @param duration How long it should take for all text objects to be removed.
     */
    function removeTextObjects(beat: number, duration: number) {
        const shuffledTextObjects = shuffle(floodingAuctioneerTextObjects);

        let timeBetweenObjects = duration / shuffledTextObjects.length;

        let currentIndex = 0;
        for(let i = shuffledTextObjects.length - 1; i > -1; i--) {
            shuffledTextObjects[i].destroyObject(beat + timeBetweenObjects * currentIndex);
            currentIndex++;
        }
    }

    /**
     * Set auctioneer texts for intro
     */
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

    /**
     * Do the auctioneer text.
     * @param beat When the event should start.
     * @param cutoff After how many beats this event should stop. Optional, event will finish in its entirety if unspecified.
     */
    function doAuctioneerTextSequence(beat: number, cutoff: number = 0, material: rm.Material = materials.sideauctioneertext) {
        let mat = material;
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

    const lightingMaterialsList = [
        materials.skyboxmaterial,
        materials.lampmaterial,
        materials.grassplanematerial,
        materials.grassmaterial3,
        materials.treematerial1,
        materials.treematerial2,
        materials.treematerial3,
        materials.rockmaterial1,
        materials.rockmaterial2,
        materials.rockmaterial3,
        materials.rockmaterial4,
        materials.treetrunkmaterial,
        materials.bushbigmaterial,
        materials.bushflowermaterial,
        materials.bushmed2material,
        materials.bushmedmaterial,
        materials.runwaymaterial,
        materials["housematerial awning"],
        materials["housematerial floor"],
        materials["housematerial main"],
        materials["housematerial roofline"],
        materials["housematerial windows"]
    ]
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
        
        const cycleObj = { _DayNightCycle: 0}
        if(duration != 0) {
            for (let t = 0; t <= duration; t += precision) {
                const progress = t / duration;
                const value = from + diff * progress;

                cycleObj._DayNightCycle = value;
            
                lightingMaterialsList.forEach(material => {
                    material.set(map, cycleObj, beat + t);
                })
            }
        }
        lightingMaterialsList.forEach(material => {
            material.set(map, { _DayNightCycle: to }, beat + duration);
        });
    }

    /**
     * Linearly changes the brightness of all the cover arts.
     * @param beat The beat on which this event should start.
     * @param duration How many beats this event should take.
     * @param from The value of the brightness at the beginning of the event.
     * @param to The value of the brightness at the end of the event.
     * @param precision How smooth the event should look / how many custom events this should take.
     */
    function setCoverArtBrightness(beat: number, duration: number, from: number, to: number, precision: number) {
        precision *= duration; // make the precision not per 1 beat, but scale over the entire length of the event
        const diff = to - from;

        const materialsList = [
            materials.coverart1material,
            materials.coverart2material,
            materials.coverart3material,
            materials.coverart4material,
            materials.coverart5material,
            materials.coverart6material,
            materials.coverart7material
        ]
        
        for (let t = 0; t <= duration; t += precision) {
            const progress = t / duration;
            const value = from + diff * progress;
    
            materialsList.forEach(material => {
                material.set(map, { _Multiplier: value }, beat + t);
            })
        }
        materialsList.forEach(material => {
            material.set(map, { _Multiplier: to }, beat + duration);
        });
    }

    /**
     * An easy way to transition the brightness of all cover arts at once.
     * @param beat When this event should start.
     * @param from The brightness of all cover arts at the beginning of this event.
     * @param to The brightness of all cover arts at the end of this event.
     */
    function coverArtBrightnessOnBeat(beat: number, from: number, to: number) {
        setCoverArtBrightness(beat, 1, from, to, 1/8)
        setCoverArtBrightness(beat + 1.5, 0.24, from, to, 1/4)
        setCoverArtBrightness(beat + 2, 0.24, from, to, 1/4)
        setCoverArtBrightness(beat + 3, 1, from, to, 1/8)
        setCoverArtBrightness(beat + 4.5, 0.24, from, to, 1/4)
        setCoverArtBrightness(beat + 5, 0.24, from, to, 1/4)
        setCoverArtBrightness(beat + 6, 1, from, to, 1/8)
    }

    /**
     * Show/hide Beat Saber's UI panels of the score, combo, song timer, etc.
     * @param beat When this event should start.
     * @param value Whether they should be toggled on or off.
     */
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

    /**
     * Places the lasers in their correct positions.
     * @param side Which side (left or right) to position.
     */
    function setLaserPositions(side: "left" | "right") {
        const sideOffset = 3;
        const rotationOffset = 2;
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


    function setGlowParticleBrightness(beat: number, duration: number, from: number, to: number, precision: number) {
        precision *= duration; // make the precision not per 1 beat, but scale over the entire length of the event
        const diff = to - from;
        
        if(duration != 0) {
            for (let t = 0; t <= duration; t += precision) {
                const progress = t / duration;
                const value = from + diff * progress;
            
                materials.glowparticlematerial.set(map, {_Opacity: value}, beat + t);
            }
        }
        materials.glowparticlematerial.set(map, { _Opacity: to }, beat + duration);
    }

    function setAuctioneerTextOpacity(beat: number, duration: number, from: number, to: number, precision: number) {
        precision *= duration; // make the precision not per 1 beat, but scale over the entire length of the event
        const diff = to - from;
        
        if(duration != 0) {
            for (let t = 0; t <= duration; t += precision) {
                const progress = t / duration;
                const value = from + diff * progress;
            
                materials.sideauctioneertext.set(map, {_Opacity: value}, beat + t);
                materials.outroauctioneertext.set(map, {_Opacity: value}, beat + t);
            }
        }
        materials.outroauctioneertext.set(map, { _Opacity: to }, beat + duration);
    }

    /// ---- { ENVIRONMENT } -----

    // Particles
    if(!chromaOnly) prefabs.mapparticles.instantiate(map, 0);

    // Skybox
    if(!chromaOnly) prefabs.skybox.instantiate(map, 0);

    // Moon
    rm.environment(map, {
        id: `Moon`,
        lookupMethod: "EndsWith",
        "localPosition": [
            0,
            22,
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
    if(!chromaOnly) rm.environment(map, {
        id: "LeftPanel",
        lookupMethod: "EndsWith",
        localPosition: [-3, 1, 5],
        rotation: [0, -20, 0],
        track: "uiPanelLeft"
    })

    // Right UI Panel
    if(!chromaOnly) rm.environment(map, {
        id: "RightPanel",
        lookupMethod: "EndsWith",
        localPosition: [3, 1, 5],
        rotation: [0, 20, 0],
        track: "uiPanelRight"
    })

    // Assign all notes to a track
    if(!chromaOnly) map.allNotes.forEach(note => {
        note.track.add("allNotes")
    })

    // Apply custom note prefab to all notes
    if(!chromaOnly) rm.assignObjectPrefab(map, {
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
    if(!chromaOnly) {
        const leftAuctioneerTextIntro = prefabs.sideauctioneertext.instantiate(map, 0)
        leftAuctioneerTextIntro.localPosition = [-2.75, 1.5, 4.5]
        leftAuctioneerTextIntro.localRotation = [-270, -20, 180]
        const rightAuctioneerTextIntro = prefabs.sideauctioneertext.instantiate(map, 0)
        rightAuctioneerTextIntro.localPosition = [2.75, 1.5, 4.5]
        rightAuctioneerTextIntro.localRotation = [-270, 20, 180]
    }

    // Static Environment Prefabs/Materials
    if(!chromaOnly) {
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
        materials.coverart2material.set(map, {_CurrentFrame: 1}, 0);
        materials.coverart3material.set(map, {_CurrentFrame: 1}, 0);
        materials.coverart4material.set(map, {_CurrentFrame: 1}, 0);
        materials.coverart5material.set(map, {_CurrentFrame: 1}, 0);
        materials.coverart6material.set(map, {_CurrentFrame: 1}, 0);
        materials.coverart7material.set(map, {_CurrentFrame: 1}, 0);
        materials.auctioneertext1.set(map , {_CurrentTexture: 13}, 0); 
        materials.auctioneertext2.set(map , {_CurrentTexture: 13}, 0);
        materials.auctioneertext3.set(map , {_CurrentTexture: 13}, 0);
        materials.auctioneertext4.set(map , {_CurrentTexture: 13}, 0);
        materials.auctioneertext5.set(map , {_CurrentTexture: 13}, 0);
        materials.sideauctioneertext.set(map, {_CurrentTexture: 13}, 0);
        materials.outroauctioneertext.set(map, {_CurrentTexture: 13}, 0);
        materials.glowparticlematerial.set(map, {_Opacity: 0}, 0);

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
    }

    // Note shadows 
    if(!chromaOnly) {
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
                // animation: {
                //     localRotation: [[0, 0, 0, 0]]
                // }
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
    }

    // Laser positions
    setLaserPositions("left");
    setLaserPositions("right");

    // Top window light
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly)  rm.geometry(map, {
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
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly) rm.geometry(map, {
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
    if(!chromaOnly)  rm.geometry(map, {
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
    if(!chromaOnly) rm.environmentRemoval(map, [
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

    if(!chromaOnly) {
        // Intro: Presents, AJR Logo, The Big Goodbye Text
        const introAnimation = prefabs.introanimation.instantiate(map, 6);
        introAnimation.destroyObject(26);
        
        placeTextObjects(0, 20, 7, 0.5, 0.5, -2.5, 0.02, 0.1, 30);
        toggleUiPanels(0, "off");

        doActioneerTextSequenceBeforeFlood();

        randomizeAuctioneerTexts(32, 0);
        randomizeAuctioneerTexts(32.5, 1);
        randomizeAuctioneerTexts(33, 2);
        randomizeAuctioneerTexts(33.5, 3);
        randomizeAuctioneerTexts(34, 4);    

        // Intro: auctioneer texts
        doAuctioneerTextSequence(43); 
        doAuctioneerTextSequence(59);
        doAuctioneerTextSequence(75);
        doAuctioneerTextSequence(91);
        doAuctioneerTextSequence(107);
        doAuctioneerTextSequence(123, 9);

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

        // Auctioneer text during verse 1
        toggleUiPanels(171, "off");
        doAuctioneerTextSequence(171, 7);
        toggleUiPanels(178, "on");
        materials.sideauctioneertext.set(map, {_CurrentTexture: 13}, 178)

        // Auctioneer text during post-chorus
        toggleUiPanels(379, "off");
        doAuctioneerTextSequence(379);
        doAuctioneerTextSequence(395);
        doAuctioneerTextSequence(411);
        toggleUiPanels(427, "on");
        materials.sideauctioneertext.set(map, {_CurrentTexture: 13}, 427)

        // Day/Night Cycles for entire song - overall song structure
        setDayNightCycle(75, 17, 0, 0.125, 1/16);                       // Intro - full beat comes in
        setDayNightCycle(92, 10, 0.125, 0.4, 1/16);                     // ^
        setDayNightCycle(102, 4, 0.4, 0.8, 1/16);                       // ^
        setDayNightCycle(106.5, 0.5, 0.8, 1, 1/16);                     // ^ 
        setDayNightCycle(231, 4, 0.65, 0, 1/16);                        // Pre-Chorus 1 - song goes quieter, first chorus at night
        setDayNightCycle(393, 2, 0, 1, 1/16);                           // Post-Chorus - beat comes back in, also verse 2/chorus 2 at day
        setDayNightCycle(475, 10, 1, 0.5, 1/16)                         // Verse 2 - go slightly darker before chorus 2
        setDayNightCycle(488, 3, 0.5, 1, 1/16)                          // Chorus 2 - go to day again for chorus 2
        setDayNightCycle(626, 2, 0.5, 0, 1/16)                          // Bridge - go dark
        setDayNightCycle(707, 43, 0, 1, 1/16)                           // Bridge - very slowly get lighter until it's suddenly dark
        setDayNightCycle(750.5, 1, 1, -1, 1/16)                         // Bridge/Drop - Suddenly turn pitch black
        materials.runwaymaterial.set(map, {_DayNightCycle: -1}, 751);
        setDayNightCycle(756, 0.5, -1, 0, 1/16)                         // Drop - go to normal night
        setDayNightCycle(848, 5, 0, 1, 1/16)                            // Drop/Outro - getting brighter at the end of the drop
        setDayNightCycle(921, 3, 0.25, -0.5, 1/16)                      // End - finish at night

        // Day/night cycles - other animations
        setDayNightCycle(109, 3, 1.25, 1, 1/16);
        setDayNightCycle(117, 3, 1.25, 1, 1/16);
        setDayNightCycle(125, 3, 1.25, 1, 1/16);
        setDayNightCycle(132, 6.5, 1, 0.75, 1/16);
        setDayNightCycle(139, 0, 1, 1, 1/1);
        setDayNightCycle(141, 3, 1.125, 1, 1/16);
        setDayNightCycle(173, 3, 1.125, 1, 1/16);
        setDayNightCycle(203, 3.5, 1.125, 0.65, 1/16);
        setDayNightCycle(207, 3.5, 1.125, 0.65, 1/16);
        setDayNightCycle(211, 8, 1.125, 0.5, 1/16);
        setDayNightCycle(219, 3.5, 1.125, 0.65, 1/16);
        setDayNightCycle(223, 3.5, 1.125, 0.65, 1/16);
        setDayNightCycle(227, 4, 1.125, 0.65, 1/16);
        setDayNightCycle(355, 2, 0.25, 0, 1/16);
        setDayNightCycle(359, 2, 0.25, 0, 1/16);
        setDayNightCycle(363, 3, 0.4, 0, 1/16);
        setDayNightCycle(397, 3, 1.25, 1, 1/16);
        setDayNightCycle(405, 3, 1.25, 1, 1/16);
        setDayNightCycle(413, 3, 1.25, 1, 1/16);
        setDayNightCycle(421, 3, 1.25, 1, 1/16);
        setDayNightCycle(433, 3, 1.25, 1, 1/16);
        setDayNightCycle(449, 3, 1.25, 1, 1/16);
        setDayNightCycle(465, 3, 1.25, 1, 1/16);
        setDayNightCycle(478, 3, 1, 0.49, 1/16);
        setDayNightCycle(482, 3, 0.8, 0.5, 1/16);
        setDayNightCycle(493, 3, 1.25, 1, 1/16);
        setDayNightCycle(501, 3, 1.25, 1, 1/16);
        setDayNightCycle(509, 3, 1.25, 1, 1/16);
        setDayNightCycle(517, 3, 1.25, 1, 1/16);
        setDayNightCycle(525, 3, 1.25, 1, 1/16);
        setDayNightCycle(533, 3, 1.25, 1, 1/16);
        setDayNightCycle(541, 3, 1.25, 1, 1/16);
        setDayNightCycle(549, 3, 1.25, 1, 1/16);
        setDayNightCycle(552, 3, 1, 0.75, 1/16);
        setDayNightCycle(555, 1, 1.125, 1, 1/16);
        setDayNightCycle(557, 3, 1.25, 1, 1/16);
        setDayNightCycle(565, 3, 1.25, 1, 1/16);
        setDayNightCycle(573, 3, 1.25, 1, 1/16);
        setDayNightCycle(581, 3, 1.25, 1, 1/16);
        setDayNightCycle(589, 3, 1.25, 1, 1/16);
        setDayNightCycle(597, 3, 1.25, 1, 1/16);
        setDayNightCycle(603, 2, 1, 0.5, 1/16);
        setDayNightCycle(607, 2, 1, 0.5, 1/16);
        setDayNightCycle(611, 3, 1, 0.5, 1/16);
        setDayNightCycle(817, 2, 0, 0.5, 1/16);
        setDayNightCycle(820, 0.5, 0.5, 0, 1/8);
        setDayNightCycle(885, 0.75, 1, 0.5, 1/8);
        setDayNightCycle(886, 0.75, 1, 0.5, 1/8);
        setDayNightCycle(887, 0.75, 1, 0.5, 1/8);
        setDayNightCycle(888, 3, 1, 0.75, 1/16);
        setDayNightCycle(901, 3, 1, 0.5, 1/16);
        setDayNightCycle(905, 3, 1, 0.5, 1/16);
        setDayNightCycle(909, 2, 1, 0.25, 1/16);
        
        // Cover art brightness for entire song
        setCoverArtBrightness(109, 3, 10, 3, 1/8)
        setCoverArtBrightness(117, 3, 10, 3, 1/8)
        setCoverArtBrightness(125, 3, 10, 3, 1/8)
        setCoverArtBrightness(141, 3, 10, 3, 1/8)
        setCoverArtBrightness(173, 3, 10, 3, 1/8)

        coverArtBrightnessOnBeat(379, 10, 3);
        coverArtBrightnessOnBeat(387, 10, 3);
        coverArtBrightnessOnBeat(395, 10, 3);
        coverArtBrightnessOnBeat(403, 10, 3);
        coverArtBrightnessOnBeat(411, 10, 3);
        coverArtBrightnessOnBeat(419, 10, 3);
        coverArtBrightnessOnBeat(427, 10, 3);
        coverArtBrightnessOnBeat(435, 10, 3);
        coverArtBrightnessOnBeat(443, 10, 3);
        coverArtBrightnessOnBeat(451, 10, 3);
        coverArtBrightnessOnBeat(459, 10, 3);
        coverArtBrightnessOnBeat(467, 10, 3);
        coverArtBrightnessOnBeat(491, 10, 3);
        coverArtBrightnessOnBeat(499, 10, 3);
        coverArtBrightnessOnBeat(507, 10, 3);
        coverArtBrightnessOnBeat(515, 10, 3);
        coverArtBrightnessOnBeat(523, 10, 3);
        coverArtBrightnessOnBeat(531, 10, 3);
        coverArtBrightnessOnBeat(539, 10, 3);
        coverArtBrightnessOnBeat(547, 10, 3);
        coverArtBrightnessOnBeat(555, 10, 3);
        coverArtBrightnessOnBeat(563, 10, 3);
        coverArtBrightnessOnBeat(571, 10, 3);
        coverArtBrightnessOnBeat(579, 10, 3);
        coverArtBrightnessOnBeat(587, 10, 3);
        coverArtBrightnessOnBeat(595, 10, 3);

        coverArtBrightnessOnBeat(788, 13, 5);
        coverArtBrightnessOnBeat(796, 13, 5);
        coverArtBrightnessOnBeat(804, 13, 5);
        coverArtBrightnessOnBeat(812, 13, 5);
        coverArtBrightnessOnBeat(820, 13, 5);
        coverArtBrightnessOnBeat(828, 13, 5);
        coverArtBrightnessOnBeat(836, 13, 5);
        coverArtBrightnessOnBeat(844, 13, 3);

        // Cover art transitions for entire song
        transitionAllCoverArt(106.5, 0.125, 0.5, "on");     // Intro
        transitionAllCoverArt(133, 0.25, 0.75, "off");      // Before Verse 1
        transitionAllCoverArt(139, 1, 0.75, "on");          // Verse 1
        transitionAllCoverArt(139, 1, 0.75, "on");          // ^
        transitionAllCoverArt(147, 1, 0.75, "off");         // ^
        transitionAllCoverArt(155, 1, 0.75, "on");          // ^
        transitionAllCoverArt(163, 1, 0.75, "off");         // ^
        transitionAllCoverArt(171, 1, 0.75, "on");          // ^
        transitionAllCoverArt(179, 1, 0.75, "off");         // ^
        transitionAllCoverArt(187, 1, 0.75, "on");          // ^
        transitionAllCoverArt(195, 1, 0.75, "off");         // ^
        transitionAllCoverArt(243, 1, 0.75, "on");          // Chorus 1 quiet
        transitionAllCoverArt(244, 1, 0.75, "off");         // ^
        transitionAllCoverArt(251, 1, 0.75, "on");          // ^
        transitionAllCoverArt(252, 1, 0.75, "off");         // ^
        transitionAllCoverArt(259, 1, 0.75, "on");          // ^
        transitionAllCoverArt(260, 1, 0.75, "off");         // ^
        transitionAllCoverArt(267, 1, 0.75, "on");          // ^
        transitionAllCoverArt(268, 1, 0.75, "off");         // ^
        transitionAllCoverArt(275, 1, 0.75, "on");          // ^
        transitionAllCoverArt(276, 1, 0.75, "off");         // ^
        transitionAllCoverArt(283, 1, 0.75, "on");          // ^
        transitionAllCoverArt(284, 1, 0.75, "off");         // ^
        transitionAllCoverArt(291, 1, 0.75, "on");          // ^
        transitionAllCoverArt(292, 1, 0.75, "off");         // ^
        transitionAllCoverArt(306, 0.125, 0.75, "on");      // Chorus 1 louder
        transitionAllCoverArt(363, 0.25, 0.75, "off");      // Chorus 1 end
        transitionAllCoverArt(379, 0, 0, "on");             // Post-Chorus
        transitionAllCoverArt(475, 1, 1.25, "off");         // Verse 2 end
        transitionAllCoverArt(489.5, 0.25, 0.25, "on");     // Chorus 2
        transitionAllCoverArt(551, 0.25, 1.25, "off");      // ^
        transitionAllCoverArt(554.5, 0.125, 0.25, "on");    // ^
        transitionAllCoverArt(613, 0.25, 0.5, "off");       // Chorus 2 end

        // Glow particles for entire song
        setGlowParticleBrightness(109, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(117, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(125, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(141, 3, 0.25, 0, 1/16);
        setGlowParticleBrightness(173, 3, 0.25, 0, 1/16);
        setGlowParticleBrightness(243, 1, 0.25, 0.25, 1/1);
        setGlowParticleBrightness(355, 1, 0.25, 0, 1/8);
        setGlowParticleBrightness(397, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(405, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(413, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(421, 3, 0.5, 0, 1/16);
        setGlowParticleBrightness(433, 3, 0.75, 0, 1/16);
        setGlowParticleBrightness(449, 3, 0.75, 0, 1/16);
        setGlowParticleBrightness(465, 3, 0.75, 0, 1/16);
        setGlowParticleBrightness(493, 3, 1, 0, 1/16);
        setGlowParticleBrightness(501, 3, 1, 0, 1/16);
        setGlowParticleBrightness(509, 3, 1, 0, 1/16);
        setGlowParticleBrightness(517, 3, 1, 0, 1/16);
        setGlowParticleBrightness(525, 3, 1, 0, 1/16);
        setGlowParticleBrightness(533, 3, 1, 0, 1/16);
        setGlowParticleBrightness(541, 3, 1, 0, 1/16);
        setGlowParticleBrightness(549, 3, 1, 0, 1/16);
        setGlowParticleBrightness(557, 3, 1, 0, 1/16);
        setGlowParticleBrightness(565, 3, 1, 0, 1/16);
        setGlowParticleBrightness(573, 3, 1, 0, 1/16);
        setGlowParticleBrightness(581, 3, 1, 0, 1/16);
        setGlowParticleBrightness(589, 3, 1, 0, 1/16);
        setGlowParticleBrightness(597, 3, 1, 0, 1/16);
        setGlowParticleBrightness(788, 1, 1, 1, 1/1);
        setGlowParticleBrightness(851, 2, 1, 0.5, 1/16);
        setGlowParticleBrightness(898, 2, 0.5, 0, 1/16);

        // Drop
        transitionCoverArt(materials.coverart5material, 756, 0.75, "on");

        transitionCoverArt(materials.coverart5material, 757.5, 0.25, "off");
        transitionCoverArt(materials.coverart1material, 757.5, 0.25, "on");

        transitionCoverArt(materials.coverart1material, 758, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 758, 0.75, "on");
        
        transitionCoverArt(materials.coverart2material, 759, 0.75, "off");
        transitionCoverArt(materials.coverart3material, 759, 0.75, "on");

        transitionCoverArt(materials.coverart3material, 760.5, 0.25, "off");
        transitionCoverArt(materials.coverart5material, 760.5, 0.25, "on");

        transitionCoverArt(materials.coverart5material, 761, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 761, 0.75, "on");
        
        transitionCoverArt(materials.coverart1material, 762, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 762, 0.75, "on");

        transitionCoverArt(materials.coverart2material, 764, 0.75, "off");
        transitionCoverArt(materials.coverart3material, 764, 0.75, "on");

        transitionCoverArt(materials.coverart3material, 765.5, 0.25, "off");
        transitionCoverArt(materials.coverart2material, 765.5, 0.25, "on");

        transitionCoverArt(materials.coverart2material, 766, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 766, 0.75, "on");

        transitionCoverArt(materials.coverart1material, 767, 0.75, "off");
        transitionCoverArt(materials.coverart5material, 767, 0.75, "on");

        transitionCoverArt(materials.coverart5material, 768.5, 0.25, "off");
        transitionCoverArt(materials.coverart3material, 768.5, 0.25, "on");

        transitionCoverArt(materials.coverart3material, 769, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 769, 0.75, "on");

        transitionCoverArt(materials.coverart2material, 770, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 770, 0.75, "on");

        transitionCoverArt(materials.coverart1material, 756 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart5material, 756 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart5material, 757.5 + 16, 0.25, "off");
        transitionCoverArt(materials.coverart1material, 757.5 + 16, 0.25, "on");

        transitionCoverArt(materials.coverart1material, 758 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 758 + 16, 0.75, "on");
        
        transitionCoverArt(materials.coverart2material, 759 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart3material, 759 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart3material, 760.5 + 16, 0.25, "off");
        transitionCoverArt(materials.coverart5material, 760.5 + 16, 0.25, "on");

        transitionCoverArt(materials.coverart5material, 761 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 761 + 16, 0.75, "on");
        
        transitionCoverArt(materials.coverart1material, 762 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 762 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart2material, 764 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart3material, 764 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart3material, 765.5 + 16, 0.25, "off");
        transitionCoverArt(materials.coverart2material, 765.5 + 16, 0.25, "on");

        transitionCoverArt(materials.coverart2material, 766 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 766 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart1material, 767 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart5material, 767 + 16, 0.75, "on");

        transitionCoverArt(materials.coverart5material, 768.5 + 16, 0.25, "off");
        transitionCoverArt(materials.coverart3material, 768.5 + 16, 0.25, "on");

        transitionCoverArt(materials.coverart3material, 769 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart2material, 769, 0.75, "on");

        transitionCoverArt(materials.coverart2material, 770 + 16, 0.75, "off");
        transitionCoverArt(materials.coverart1material, 770 + 16, 0.75, "on");

        transitionAllCoverArt(787, 0.125, 0.25, "on");
        transitionAllCoverArt(921, 0.5, 1, "off"); // end

        // Outro auctioneer particles
        toggleUiPanels(751.5, "off");
        doAuctioneerTextSequence(788, 90, materials.outroauctioneertext);
        doAuctioneerTextSequence(788);
        doAuctioneerTextSequence(804, 90, materials.outroauctioneertext);
        doAuctioneerTextSequence(804);
        doAuctioneerTextSequence(820, 90, materials.outroauctioneertext);
        doAuctioneerTextSequence(820);
        doAuctioneerTextSequence(836, 90, materials.outroauctioneertext);
        doAuctioneerTextSequence(836);
        setAuctioneerTextOpacity(844, 6, 1, 0, 1/16);
        toggleUiPanels(853, "on");
    }

    // Darker colors for bridge
    map.colorNotes.forEach(note => {
        if(note.beat >= 627 && note.beat <= 752 && !note.track.array.includes("noteShadowsFull") && !note.track.array.includes("noteShadowsHalf") && !note.track.array.includes("noteShadowsFaint")) {
            if(note.color == rm.NoteColor.RED) note.chromaColor = [0.351, 0.412, 0.114]
            else if(note.color == rm.NoteColor.BLUE) note.chromaColor = [0.249, 0.498, 0.62]
        }
    })
    // Slower NJS/RT for Expert+ ()
    if(!chromaOnly) {
        if(!file.includes("ExpertPlus")) return;
        map.allNotes.forEach(note => {
            if(note.beat >= 627 && note.beat <= 752 && !note.track.array.includes("noteShadowsFull") && !note.track.array.includes("noteShadowsHalf") && !note.track.array.includes("noteShadowsFaint")) {
                note.noteJumpMovementSpeed = map.difficultyInfo.noteJumpMovementSpeed * 0.823529412; // based on Expert+ 17 => 14
                note.reactionTime = note.reactionTime * 1.14566285; // based on Expert+ 611 => 700
            }
        })
        map.arcs.forEach(arc => {
            if(arc.beat >= 627 && arc.beat <= 752) {
                arc.noteJumpMovementSpeed = map.difficultyInfo.noteJumpMovementSpeed * 0.823529412; // based on Expert+ 17 => 14
                arc.reactionTime = arc.reactionTime * 1.14566285; // based on Expert+ 611 => 700
            }
        })
    }

    // Convert lighting of lanterns/window to alternative objects in the base Billie environment (for non-vivify diffs)
    if(chromaOnly) map.lightEvents.forEach(event => {
        if(event.type == 0 && event.lightID == 5) event.lightID = 1
        if(event.type == 0 && event.lightID == 6) event.lightID = 2
        if(event.type == 7 && event.lightID == 5) {
            event.lightID = 1
            event.copy().lightID = 2
            
        }
        if(event.type == 6 && event.lightID == 5) {
            event.lightID = 1
            event.copy().lightID = 2
        }
        if(event.type == 1 && event.lightID == 5) event.lightID = 1
        if(event.type == 1 && event.lightID == 6) event.lightID = 2
    })
}

await Promise.all([
    doMap("ExpertPlusStandard"),
    doMap("ExpertStandard"),
    doMap("HardStandard"),
    doMap("NormalStandard"),
    doMap("EasyStandard"),
    doMap("ExpertPlusOneSaber"),
    doMap("ExpertPlusLawless", true),
    doMap("ExpertLawless", true),
    doMap("HardLawless", true),
    doMap("NormalLawless", true),
    doMap("EasyLawless", true),
    doMap("ExpertOneSaber", true)
])

// ----------- { OUTPUT } -----------

pipeline.export({
    outputDirectory: '../OutputMaps/The Big Goodbye - AJR'
})
