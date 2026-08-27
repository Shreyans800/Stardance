// Rocket Launch Simulator — JavaScript version
// Based on the new Python/Streamlit reference implementation.
//
// Features:
// - Full rocket thrust equation
// - Variable mass and fuel consumption
// - Atmospheric pressure, density, temperature and sound speed
// - Vector aerodynamic drag
// - Variable gravity
// - Launch angle measured from ground
// - Orbital velocity calculation
// - Animated trajectory
// - Rocket rotation in 5° increments
// - Planned trajectory + traveled trajectory
// - Flight analysis charts
// - CSV export

const G0 = 9.80665;
const R_EARTH = 6371000.0;
const MU_EARTH = 3.986004418e14;
const R_AIR = 287.05;
const GAMMA = 1.4;

// ============================================================
// ATMOSPHERE
// ============================================================

function atmosphere(h) {
    h = Math.max(0, h);

    let T, P;

    if (h < 11000) {
        T = 288.15 - 0.0065 * h;
        P = 101325 * Math.pow(T / 288.15, 5.25588);
    } else if (h < 20000) {
        T = 216.65;
        P = 22632.06 * Math.exp(
            -G0 * (h - 11000) / (R_AIR * T)
        );
    } else if (h < 32000) {
        T = 216.65 + 0.001 * (h - 20000);
        P = 5474.89 * Math.pow(
            T / 216.65,
            -G0 / (0.001 * R_AIR)
        );
    } else if (h < 47000) {
        T = 228.65 + 0.0028 * (h - 32000);
        P = 868.02 * Math.pow(
            T / 228.65,
            -G0 / (0.0028 * R_AIR)
        );
    } else {
        T = 270.65;
        P = 110.0 * Math.exp(
            -(h - 47000) / 7000
        );
    }

    const rho = P / (R_AIR * T);
    const sound = Math.sqrt(GAMMA * R_AIR * T);

    return {
        density: rho,
        pressure: P,
        temperature: T,
        soundSpeed: sound
    };
}

// ============================================================
// ROCKET SIMULATION
// ============================================================

function simulateRocket({
    dryMass = 20000,
    fuelMass = 50000,
    specificImpulse = 300,
    burnTime = 150,
    dragCoefficient = 0.35,
    referenceArea = 10,
    launchAngle = 90,
    simulationTime = 600,
    dt = 2,
    targetAltitude = 200000,
    nozzleExitPressure = 50000,
    nozzleExitArea = 1
}) {
    let mass = dryMass + fuelMass;
    let fuel = fuelMass;

    let altitude = 0;
    let vx = 0;
    let vy = 0;
    let x = 0;

    const rows = [];

    const exhaustVelocity = specificImpulse * G0;
    const massFlowRate = fuelMass / burnTime;

    const angleRad = launchAngle * Math.PI / 180;

    const thrustDirectionX = Math.cos(angleRad);
    const thrustDirectionY = Math.sin(angleRad);

    let totalImpulse = 0;

    const totalSteps = Math.floor(simulationTime / dt);

    for (let step = 0; step <= totalSteps; step++) {

        const time = step * dt;

        const atm = atmosphere(altitude);

        const rho = atm.density;
        const pressure = atm.pressure;
        const temperature = atm.temperature;
        const soundSpeed = atm.soundSpeed;

        // ----------------------------------------------------
        // ENGINE
        // ----------------------------------------------------

        let thrust = 0;

        if (fuel > 0 && time < burnTime) {

            // T = mdot * Ve + (Pe - Pa) * Ae
            thrust = Math.max(
                0,
                massFlowRate * exhaustVelocity +
                (nozzleExitPressure - pressure) * nozzleExitArea
            );

            fuel -= Math.min(
                massFlowRate * dt,
                fuel
            );

            mass = dryMass + fuel;

        } else {

            thrust = 0;
            mass = dryMass;
        }

        // ----------------------------------------------------
        // GRAVITY
        // ----------------------------------------------------

        const gravity =
            G0 *
            Math.pow(
                R_EARTH / (R_EARTH + altitude),
                2
            );

        // ----------------------------------------------------
        // VELOCITY
        // ----------------------------------------------------

        let velocity = Math.hypot(vx, vy);

        // ----------------------------------------------------
        // DYNAMIC PRESSURE
        // ----------------------------------------------------

        const dynamicPressure =
            0.5 * rho * velocity * velocity;

        // ----------------------------------------------------
        // VECTOR DRAG
        // ----------------------------------------------------

        const drag =
            dynamicPressure *
            dragCoefficient *
            referenceArea;

        let dragX = 0;
        let dragY = 0;

        if (velocity > 0) {
            dragX = -drag * vx / velocity;
            dragY = -drag * vy / velocity;
        }

        // ----------------------------------------------------
        // THRUST COMPONENTS
        // ----------------------------------------------------

        const thrustX =
            thrust * thrustDirectionX;

        const thrustY =
            thrust * thrustDirectionY;

        // ----------------------------------------------------
        // ACCELERATION
        // ----------------------------------------------------

        const accelerationX =
            (thrustX + dragX) / mass;

        const accelerationY =
            (thrustY + dragY - mass * gravity) / mass;

        const acceleration =
            Math.hypot(
                accelerationX,
                accelerationY
            );

        // ----------------------------------------------------
        // INTEGRATION
        // ----------------------------------------------------

        vx += accelerationX * dt;
        vy += accelerationY * dt;

        x += vx * dt;
        altitude += vy * dt;

        if (altitude < 0) {
            altitude = 0;
            vy = 0;
        }

        // ----------------------------------------------------
        // UPDATED VELOCITY
        // ----------------------------------------------------

        velocity = Math.hypot(vx, vy);

        // ----------------------------------------------------
        // MACH
        // ----------------------------------------------------

        const mach =
            soundSpeed > 0
                ? velocity / soundSpeed
                : 0;

        // ----------------------------------------------------
        // ORBITAL VELOCITY
        // ----------------------------------------------------

        const orbitalVelocity =
            Math.sqrt(
                MU_EARTH /
                (R_EARTH + altitude)
            );

        // ----------------------------------------------------
        // IMPULSE
        // ----------------------------------------------------

        totalImpulse += thrust * dt;

        // ----------------------------------------------------
        // STORE DATA
        // ----------------------------------------------------

        rows.push({
            time,
            altitude,
            velocity,
            velocityX: vx,
            velocityY: vy,

            acceleration,
            accelerationX,
            accelerationY,

            mass,
            fuel,

            thrust,
            thrustX,
            thrustY,

            drag,
            dragX,
            dragY,

            gravity,

            density: rho,
            pressure,
            temperature,

            mach,
            dynamicPressure,

            orbitalVelocity,

            x,
            y: altitude
        });

        // ----------------------------------------------------
        // TERMINATION
        // ----------------------------------------------------

        if (
            (altitude <= 0 && time > 5 && vy < 0) ||
            altitude >= targetAltitude
        ) {
            break;
        }
    }

    if (rows.length === 0) {
        return null;
    }

    const maxAltitude =
        Math.max(...rows.map(r => r.altitude));

    const maxVelocity =
        Math.max(...rows.map(r => r.velocity));

    const maxAcceleration =
        Math.max(...rows.map(r => r.acceleration));

    const maxDynamicPressure =
        Math.max(...rows.map(r => r.dynamicPressure));

    const finalRow =
        rows[rows.length - 1];

    const finalVelocity =
        finalRow.velocity;

    const finalAltitude =
        finalRow.altitude;

    const targetOrbitalVelocity =
        Math.sqrt(
            MU_EARTH /
            (R_EARTH + targetAltitude)
        );

    const velocityRatio =
        targetOrbitalVelocity > 0
            ? finalVelocity / targetOrbitalVelocity
            : 0;

    return {
        data: rows,

        maxAltitude,
        maxVelocity,
        maxAcceleration,
        maxDynamicPressure,

        finalVelocity,
        finalAltitude,

        orbitalVelocity:
            targetOrbitalVelocity,

        velocityRatio,

        massFlowRate,
        burnTime,
        totalImpulse
    };
}

// ============================================================
// ROCKET IMAGE
// ============================================================

function createRocketSVG(angle = 0) {

    return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="160"
            height="160"
            viewBox="0 0 160 160"
        >
            <g transform="rotate(${angle} 80 80)">

                <!-- Rocket body -->
                <path
                    d="
                        M80 12
                        L48 58
                        L48 108
                        L112 108
                        L112 58
                        Z
                    "
                    fill="#ebedf2"
                />

                <!-- Window -->
                <circle
                    cx="80"
                    cy="62"
                    r="20"
                    fill="#235f96"
                    stroke="#d2e1f0"
                    stroke-width="3"
                />

                <!-- Left fin -->
                <path
                    d="
                        M48 82
                        L20 120
                        L48 108
                        Z
                    "
                    fill="#c82d2d"
                />

                <!-- Right fin -->
                <path
                    d="
                        M112 82
                        L140 120
                        L112 108
                        Z
                    "
                    fill="#c82d2d"
                />

                <!-- Engine -->
                <rect
                    x="52"
                    y="100"
                    width="56"
                    height="16"
                    fill="#d2d6dc"
                />

                <!-- Outer flame -->
                <path
                    d="
                        M60 114
                        L80 154
                        L100 114
                        Z
                    "
                    fill="#ff9123"
                />

                <!-- Inner flame -->
                <path
                    d="
                        M69 114
                        L80 145
                        L91 114
                        Z
                    "
                    fill="#ffdc50"
                />

            </g>
        </svg>
    `;
}

// ============================================================
// ROCKET HEADING
// ============================================================

function getRocketHeading(vx, vy, launchAngle) {

    const speed = Math.hypot(vx, vy);

    let xVelocity = vx;
    let yVelocity = vy;

    if (speed < 1e-9) {
        const angle =
            launchAngle * Math.PI / 180;

        xVelocity = Math.cos(angle);
        yVelocity = Math.sin(angle);
    }

    let heading =
        Math.atan2(
            yVelocity,
            xVelocity
        ) * 180 / Math.PI;

    if (heading < 0) {
        heading += 360;
    }

    return (
        Math.round(heading / 5) * 5
    ) % 360;
}

// ============================================================
// CSV EXPORT
// ============================================================

function rocketDataToCSV(data) {

    if (!data || data.length === 0) {
        return "";
    }

    const columns = [
        "time",
        "altitude",
        "velocity",
        "velocityX",
        "velocityY",
        "acceleration",
        "accelerationX",
        "accelerationY",
        "mass",
        "fuel",
        "thrust",
        "thrustX",
        "thrustY",
        "drag",
        "dragX",
        "dragY",
        "gravity",
        "density",
        "pressure",
        "temperature",
        "mach",
        "dynamicPressure",
        "orbitalVelocity",
        "x",
        "y"
    ];

    const header =
        columns.join(",");

    const lines =
        data.map(row =>
            columns.map(column => {

                const value = row[column];

                if (
                    typeof value === "string" &&
                    value.includes(",")
                ) {
                    return `"${value}"`;
                }

                return value;

            }).join(",")
        );

    return [
        header,
        ...lines
    ].join("\n");
}

// ============================================================
// DOWNLOAD CSV
// ============================================================

function downloadCSV(data, filename = "rocket_simulation.csv") {

    const csv =
        rocketDataToCSV(data);

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// ============================================================
// PLOTLY TRAJECTORY
// ============================================================

function createTrajectoryFigure(result, launchAngle) {

    const data = result.data;

    const xKm =
        data.map(r => r.x / 1000);

    const yKm =
        data.map(r => r.altitude / 1000);

    const maxX =
        Math.max(
            1,
            ...xKm.map(v => Math.abs(v))
        );

    const maxY =
        Math.max(
            1,
            ...yKm
        );

    let xMin;
    let xMax;

    if (launchAngle === 90) {

        xMin = -maxX * 0.45;
        xMax = maxX * 0.45;

    } else {

        xMin =
            Math.min(
                -maxX * 0.08,
                -1
            );

        xMax =
            Math.max(
                maxX * 1.15,
                10
            );
    }

    const yMin = 0;
    const yMax =
        Math.max(
            maxY * 1.15,
            10
        );

    const plannedTrajectory = {
        x: xKm,
        y: yKm,

        mode: "lines",

        name: "Planned Trajectory",

        line: {
            width: 2,
            dash: "dot"
        },

        opacity: 0.45
    };

    const traveledTrajectory = {
        x: [xKm[0]],
        y: [yKm[0]],

        mode: "lines",

        name: "Rocket Path",

        line: {
            width: 4
        }
    };

    const layout = {

        height: 680,

        paper_bgcolor: "rgb(2,7,18)",
        plot_bgcolor: "rgb(5,15,32)",

        font: {
            color: "white"
        },

        xaxis: {
            title: "Horizontal Distance (km)",

            range: [
                xMin,
                xMax
            ],

            zeroline: true,

            zerolinecolor:
                "rgba(255,255,255,0.30)",

            gridcolor:
                "rgba(255,255,255,0.10)",

            showline: true,

            linecolor:
                "rgba(255,255,255,0.35)"
        },

        yaxis: {
            title: "Altitude (km)",

            range: [
                yMin,
                yMax
            ],

            zeroline: true,

            zerolinecolor:
                "rgba(255,255,255,0.30)",

            gridcolor:
                "rgba(255,255,255,0.10)",

            showline: true,

            linecolor:
                "rgba(255,255,255,0.35)"
        },

        margin: {
            l: 70,
            r: 30,
            t: 40,
            b: 100
        }
    };

    return {
        data: [
            plannedTrajectory,
            traveledTrajectory
        ],
        layout
    };
}

// ============================================================
// PLOTLY ANIMATED TRAJECTORY
// ============================================================

function createAnimatedTrajectory(
    result,
    launchAngle,
    containerId
) {

    const data = result.data;

    const xKm =
        data.map(r => r.x / 1000);

    const yKm =
        data.map(r => r.altitude / 1000);

    const times =
        data.map(r => r.time);

    const maxX =
        Math.max(
            1,
            ...xKm.map(v => Math.abs(v))
        );

    const maxY =
        Math.max(
            1,
            ...yKm
        );

    let xMin;
    let xMax;

    if (launchAngle === 90) {

        xMin = -maxX * 0.45;
        xMax = maxX * 0.45;

    } else {

        xMin =
            Math.min(
                -maxX * 0.08,
                -1
            );

        xMax =
            Math.max(
                maxX * 1.15,
                10
            );
    }

    const yMin = 0;

    const yMax =
        Math.max(
            maxY * 1.15,
            10
        );

    const numberOfFrames =
        Math.min(
            data.length,
            180
        );

    const frameIndices = [];

    for (
        let i = 0;
        i < numberOfFrames;
        i++
    ) {

        const index =
            Math.round(
                i *
                (data.length - 1) /
                Math.max(
                    1,
                    numberOfFrames - 1
                )
            );

        frameIndices.push(index);
    }

    const rocketSizeX =
        Math.max(
            (xMax - xMin) * 0.15,
            0.5
        );

    const rocketSizeY =
        Math.max(
            (yMax - yMin) * 0.15,
            0.5
        );

    const frames =
        frameIndices.map(
            (index, frameNumber) => {

                const row =
                    data[index];

                const heading =
                    getRocketHeading(
                        row.velocityX,
                        row.velocityY,
                        launchAngle
                    );

                const traveledX =
                    xKm.slice(
                        0,
                        index + 1
                    );

                const traveledY =
                    yKm.slice(
                        0,
                        index + 1
                    );

                return {
                    name:
                        String(frameNumber),

                    data: [
                        {
                            x: traveledX,
                            y: traveledY
                        }
                    ],

                    layout: {
                        images: [
                            {
                                source:
                                    "data:image/svg+xml;charset=utf-8," +
                                    encodeURIComponent(
                                        createRocketSVG(
                                            heading
                                        )
                                    ),

                                x: xKm[index],
                                y: yKm[index],

                                xref: "x",
                                yref: "y",

                                sizex:
                                    rocketSizeX,

                                sizey:
                                    rocketSizeY,

                                xanchor: "center",
                                yanchor: "middle",

                                sizing: "contain",

                                layer: "above",

                                opacity: 1
                            }
                        ]
                    }
                };
            }
        );

    const initialHeading =
        Math.round(
            launchAngle / 5
        ) * 5 % 360;

    const initialImage = {
        source:
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
                createRocketSVG(
                    initialHeading
                )
            ),

        x: xKm[0],
        y: yKm[0],

        xref: "x",
        yref: "y",

        sizex:
            rocketSizeX,

        sizey:
            rocketSizeY,

        xanchor: "center",
        yanchor: "middle",

        sizing: "contain",

        layer: "above",

        opacity: 1
    };

    const figure = {

        data: [

            {
                x: xKm,
                y: yKm,

                mode: "lines",

                name: "Planned Trajectory",

                line: {
                    width: 2,
                    dash: "dot"
                },

                opacity: 0.45
            },

            {
                x: [xKm[0]],
                y: [yKm[0]],

                mode: "lines",

                name: "Rocket Path",

                line: {
                    width: 4
                }
            }

        ],

        layout: {

            height: 680,

            paper_bgcolor:
                "rgb(2,7,18)",

            plot_bgcolor:
                "rgb(5,15,32)",

            font: {
                color: "white"
            },

            xaxis: {

                title:
                    "Horizontal Distance (km)",

                range: [
                    xMin,
                    xMax
                ],

                zeroline: true,

                zerolinecolor:
                    "rgba(255,255,255,0.30)",

                gridcolor:
                    "rgba(255,255,255,0.10)",

                showline: true,

                linecolor:
                    "rgba(255,255,255,0.35)"
            },

            yaxis: {

                title:
                    "Altitude (km)",

                range: [
                    yMin,
                    yMax
                ],

                zeroline: true,

                zerolinecolor:
                    "rgba(255,255,255,0.30)",

                gridcolor:
                    "rgba(255,255,255,0.10)",

                showline: true,

                linecolor:
                    "rgba(255,255,255,0.35)"
            },

            images: [
                initialImage
            ],

            hovermode:
                "closest",

            updatemenus: [
                {
                    type: "buttons",

                    direction: "left",

                    x: 0,
                    y: 1.08,

                    showactive: false,

                    buttons: [

                        {
                            label: "Play",

                            method: "animate",

                            args: [
                                null,
                                {
                                    frame: {
                                        duration: 70,
                                        redraw: true
                                    },

                                    transition: {
                                        duration: 0
                                    },

                                    fromcurrent: false,

                                    mode: "immediate"
                                }
                            ]
                        },

                        {
                            label: "Pause",

                            method: "animate",

                            args: [
                                [null],
                                {
                                    frame: {
                                        duration: 0,
                                        redraw: false
                                    },

                                    transition: {
                                        duration: 0
                                    },

                                    mode: "immediate"
                                }
                            ]
                        }

                    ]
                }
            ],

            sliders: [
                {
                    active: 0,

                    x: 0,
                    y: -0.10,

                    len: 1,

                    currentvalue: {
                        prefix:
                            "Simulation Time: "
                    },

                    steps:
                        frameIndices.map(
                            (index, n) => {

                                return {
                                    label:
                                        `${times[index].toFixed(1)}s`,

                                    method:
                                        "animate",

                                    args: [
                                        [String(n)],
                                        {
                                            frame: {
                                                duration: 0,
                                                redraw: true
                                            },

                                            transition: {
                                                duration: 0
                                            },

                                            mode:
                                                "immediate"
                                        }
                                    ]
                                };

                            }
                        )
                }
            ],

            margin: {
                l: 70,
                r: 30,
                t: 100,
                b: 110
            }
        },

        frames
    };

    Plotly.newPlot(
        containerId,
        figure.data,
        figure.layout,
        {
            responsive: true
        }
    ).then(() => {

        Plotly.addFrames(
            containerId,
            frames
        );

    });
}

// ============================================================
// GENERIC PLOTLY CHART
// ============================================================

function createChart(
    containerId,
    traces,
    xTitle,
    yTitle,
    height = 450
) {

    const layout = {

        height,

        paper_bgcolor:
            "rgb(2,7,18)",

        plot_bgcolor:
            "rgb(5,15,32)",

        font: {
            color: "white"
        },

        xaxis: {
            title: xTitle,

            gridcolor:
                "rgba(255,255,255,0.10)"
        },

        yaxis: {
            title: yTitle,

            gridcolor:
                "rgba(255,255,255,0.10)"
        },

        margin: {
            l: 65,
            r: 25,
            t: 30,
            b: 60
        },

        hovermode:
            "x unified"
    };

    Plotly.newPlot(
        containerId,
        traces,
        layout,
        {
            responsive: true
        }
    );
}

// ============================================================
// ALL ANALYSIS CHARTS
// ============================================================

function createAnalysisCharts(result) {

    const data = result.data;

    const time =
        data.map(r => r.time);

    const altitude =
        data.map(r =>
            r.altitude / 1000
        );

    const distance =
        data.map(r =>
            r.x / 1000
        );

    const velocity =
        data.map(r =>
            r.velocity / 1000
        );

    const velocityX =
        data.map(r =>
            r.velocityX / 1000
        );

    const velocityY =
        data.map(r =>
            r.velocityY / 1000
        );

    const acceleration =
        data.map(r =>
            r.acceleration / G0
        );

    const mass =
        data.map(r => r.mass);

    const fuel =
        data.map(r => r.fuel);

    const thrust =
        data.map(r =>
            r.thrust / 1000
        );

    const drag =
        data.map(r =>
            r.drag / 1000
        );

    const mach =
        data.map(r => r.mach);

    // --------------------------------------------------------
    // FLIGHT TRAJECTORY
    // --------------------------------------------------------

    createChart(
        "trajectory-chart",

        [
            {
                x: distance,
                y: altitude,

                mode: "lines",

                name: "Rocket"
            }
        ],

        "Horizontal Distance (km)",
        "Altitude (km)",
        500
    );

    // --------------------------------------------------------
    // ALTITUDE
    // --------------------------------------------------------

    createChart(
        "altitude-chart",

        [
            {
                x: time,
                y: altitude,

                mode: "lines",

                name: "Altitude"
            }
        ],

        "Time (s)",
        "Altitude (km)",
        450
    );

    // --------------------------------------------------------
    // VELOCITY
    // --------------------------------------------------------

    createChart(
        "velocity-chart",

        [
            {
                x: time,
                y: velocity,

                mode: "lines",

                name: "Velocity"
            },

            {
                x: time,
                y: velocityX,

                mode: "lines",

                name: "Horizontal Velocity"
            },

            {
                x: time,
                y: velocityY,

                mode: "lines",

                name: "Vertical Velocity"
            }
        ],

        "Time (s)",
        "Velocity (km/s)",
        450
    );

    // --------------------------------------------------------
    // ACCELERATION
    // --------------------------------------------------------

    createChart(
        "acceleration-chart",

        [
            {
                x: time,
                y: acceleration,

                mode: "lines",

                name: "Total Acceleration"
            }
        ],

        "Time (s)",
        "Acceleration (g)",
        450
    );

    // --------------------------------------------------------
    // MASS / FUEL
    // --------------------------------------------------------

    createChart(
        "mass-chart",

        [
            {
                x: time,
                y: mass,

                mode: "lines",

                name: "Total Mass"
            },

            {
                x: time,
                y: fuel,

                mode: "lines",

                name: "Fuel Remaining"
            }
        ],

        "Time (s)",
        "Mass (kg)",
        450
    );

    // --------------------------------------------------------
    // THRUST / DRAG
    // --------------------------------------------------------

    createChart(
        "force-chart",

        [
            {
                x: time,
                y: thrust,

                mode: "lines",

                name: "Thrust"
            },

            {
                x: time,
                y: drag,

                mode: "lines",

                name: "Drag"
            }
        ],

        "Time (s)",
        "Force (kN)",
        450
    );

    // --------------------------------------------------------
    // MACH
    // --------------------------------------------------------

    createChart(
        "mach-chart",

        [
            {
                x: time,
                y: mach,

                mode: "lines",

                name: "Mach"
            }
        ],

        "Time (s)",
        "Mach",
        400
    );
}

// ============================================================
// SIMULATION UI HELPERS
// ============================================================

function formatNumber(value, decimals = 2) {

    return Number(value)
        .toLocaleString(
            undefined,
            {
                minimumFractionDigits:
                    decimals,

                maximumFractionDigits:
                    decimals
            }
        );
}

function formatMass(value) {
    return (
        formatNumber(value, 1) +
        " kg"
    );
}

function formatVelocity(value) {
    return (
        formatNumber(
            value / 1000,
            2
        ) +
        " km/s"
    );
}

function formatAltitude(value) {
    return (
        formatNumber(
            value / 1000,
            2
        ) +
        " km"
    );
}

function formatAcceleration(value) {
    return (
        formatNumber(
            value / G0,
            2
        ) +
        " g"
    );
}

function formatPressure(value) {
    return (
        formatNumber(
            value / 1000,
            1
        ) +
        " kPa"
    );
}

// ============================================================
// SIMULATION VALIDATION
// ============================================================

function validateRocketParameters(parameters) {

    const errors = [];

    if (parameters.dryMass <= 0) {
        errors.push(
            "Dry mass must be greater than zero."
        );
    }

    if (parameters.fuelMass <= 0) {
        errors.push(
            "Fuel mass must be greater than zero."
        );
    }

    if (parameters.specificImpulse <= 0) {
        errors.push(
            "Specific impulse must be greater than zero."
        );
    }

    if (parameters.burnTime <= 0) {
        errors.push(
            "Burn time must be greater than zero."
        );
    }

    if (parameters.dragCoefficient < 0) {
        errors.push(
            "Drag coefficient cannot be negative."
        );
    }

    if (parameters.referenceArea <= 0) {
        errors.push(
            "Reference area must be greater than zero."
        );
    }

    if (
        parameters.launchAngle < 0 ||
        parameters.launchAngle > 90
    ) {
        errors.push(
            "Launch angle must be between 0° and 90°."
        );
    }

    if (parameters.simulationTime <= 0) {
        errors.push(
            "Simulation time must be greater than zero."
        );
    }

    if (parameters.dt <= 0) {
        errors.push(
            "Simulation time step must be greater than zero."
        );
    }

    if (parameters.targetAltitude <= 0) {
        errors.push(
            "Target altitude must be greater than zero."
        );
    }

    if (parameters.nozzleExitPressure < 0) {
        errors.push(
            "Nozzle exit pressure cannot be negative."
        );
    }

    if (parameters.nozzleExitArea <= 0) {
        errors.push(
            "Nozzle exit area must be greater than zero."
        );
    }

    return errors;
}

// ============================================================
// RUN SIMULATION
// ============================================================

function runRocketSimulation(parameters) {

    const errors =
        validateRocketParameters(
            parameters
        );

    if (errors.length > 0) {
        throw new Error(
            errors.join("\n")
        );
    }

    return simulateRocket({
        dryMass:
            parameters.dryMass,

        fuelMass:
            parameters.fuelMass,

        specificImpulse:
            parameters.specificImpulse,

        burnTime:
            parameters.burnTime,

        dragCoefficient:
            parameters.dragCoefficient,

        referenceArea:
            parameters.referenceArea,

        launchAngle:
            parameters.launchAngle,

        simulationTime:
            parameters.simulationTime,

        dt:
            parameters.dt,

        targetAltitude:
            parameters.targetAltitude,

        nozzleExitPressure:
            parameters.nozzleExitPressure,

        nozzleExitArea:
            parameters.nozzleExitArea
    });
}

// ============================================================
// DISPLAY SUMMARY
// ============================================================

function getSimulationSummary(result) {

    return {

        maximumAltitude:
            formatAltitude(
                result.maxAltitude
            ),

        maximumVelocity:
            formatVelocity(
                result.maxVelocity
            ),

        maximumAcceleration:
            formatAcceleration(
                result.maxAcceleration
            ),

        peakDynamicPressure:
            formatPressure(
                result.maxDynamicPressure
            ),

        finalAltitude:
            formatAltitude(
                result.finalAltitude
            ),

        finalVelocity:
            formatVelocity(
                result.finalVelocity
            ),

        requiredCircularVelocity:
            formatVelocity(
                result.orbitalVelocity
            ),

        velocityRatio:
            formatNumber(
                result.velocityRatio * 100,
                1
            ) + "%",

        massFlowRate:
            formatNumber(
                result.massFlowRate,
                2
            ) + " kg/s",

        burnTime:
            formatNumber(
                result.burnTime,
                1
            ) + " s",

        totalImpulse:
            formatNumber(
                result.totalImpulse / 1e9,
                2
            ) + " GN·s"
    };
}

// ============================================================
// ORBITAL STATUS
// ============================================================

function getOrbitalStatus(
    result,
    targetAltitude
) {

    const altitudeReached =
        result.finalAltitude >=
        targetAltitude * 0.95;

    const velocityReached =
        result.velocityRatio >= 0.95;

    if (
        altitudeReached &&
        velocityReached
    ) {

        return {
            type: "success",

            message:
                "The simulated vehicle reached approximately orbital velocity at the target altitude."
        };

    }

    if (altitudeReached) {

        return {
            type: "warning",

            message:
                "Target altitude reached, but velocity is insufficient for a circular orbit."
        };

    }

    return {
        type: "error",

        message:
            "The rocket did not reach the target altitude."
    };
}

// ============================================================
// EXAMPLE
// ============================================================
//
// const result = runRocketSimulation({
//     dryMass: 20000,
//     fuelMass: 50000,
//     specificImpulse: 300,
//     burnTime: 150,
//     dragCoefficient: 0.35,
//     referenceArea: 10,
//     launchAngle: 90,
//     simulationTime: 600,
//     dt: 2,
//     targetAltitude: 200000,
//     nozzleExitPressure: 50000,
//     nozzleExitArea: 1
// });
//
// console.log(result);
//
// ============================================================

// Export functions for use from other JavaScript modules.

if (typeof module !== "undefined" && module.exports) {

    module.exports = {
        atmosphere,
        simulateRocket,
        createRocketSVG,
        getRocketHeading,
        rocketDataToCSV,
        downloadCSV,
        createTrajectoryFigure,
        createAnimatedTrajectory,
        createChart,
        createAnalysisCharts,
        validateRocketParameters,
        runRocketSimulation,
        getSimulationSummary,
        getOrbitalStatus
    };
}