"use strict";

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

// Gesamtzeitraum: Start inklusive (07.09.2026), Ende exklusiv (01.05.2027),
// sodass der 30.04.2027 vollstaendig im Zeitraum liegt. Monate sind 0-basiert.
// Der Zeitraum ist wegen des verkuerzten Schuljahres (RDP) kuerzer als das reguelaere Schuljahr.
var RANGE_START = new Date(2026, 8, 7, 0, 0, 0, 0);
var RANGE_END = new Date(2027, 4, 1, 0, 0, 0, 0);

// Schulfreie Zeiten Niederoesterreich 2026/27 (beide Grenzen inklusive, Format JJJJ-MM-TT).
// Wochenenden muessen nicht eingetragen werden, sie zaehlen ohnehin nie als Schultag.
var FREE_PERIODS = [
    { from: "2026-10-26", to: "2026-10-26", label: "Nationalfeiertag" },
    { from: "2026-10-27", to: "2026-10-31", label: "Herbstferien" },
    { from: "2026-11-02", to: "2026-11-02", label: "Allerseelen" },
    { from: "2026-11-15", to: "2026-11-15", label: "Landespatron Hl. Leopold" },
    { from: "2026-12-08", to: "2026-12-08", label: "Mariä Empfängnis" },
    { from: "2026-12-24", to: "2027-01-06", label: "Weihnachtsferien (inkl. Hl. Drei Könige)" },
    { from: "2027-02-01", to: "2027-02-06", label: "Semesterferien Niederösterreich" },
    { from: "2027-03-20", to: "2027-03-29", label: "Osterferien (inkl. Ostermontag)" }
];

// Schulautonome Tage sind pro Schule verschieden und daher nicht vorbelegt.
// Beispiel: { from: "2026-12-07", to: "2026-12-07", label: "Schulautonomer Tag" }
var SCHOOL_AUTONOMOUS_DAYS = [];

// Dauer eines Sprungs der Figur in Millisekunden.
var HOP_DURATION_MS = 800;

// Verzoegerung vor dem Sprung, damit die Figur kurz auf dem Startpunkt sichtbar ist.
var HOP_DELAY_MS = 400;

var TRACK_PREFIXES = ["total", "month", "week"];

// ---------------------------------------------------------------------------
// Datumshilfen
// ---------------------------------------------------------------------------

// Wandelt JJJJ-MM-TT in ein lokales Datum um (ohne Zeitzonenverschiebung).
function parseIsoDate(text) {
    var parts = text.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
}

// Liefert das Datum um die angegebene Anzahl Tage verschoben (Uhrzeit 00:00).
function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

// Liefert den Tagesanfang (00:00) eines Datums.
function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

// Liefert einen sortierbaren Schluessel JJJJ-MM-TT.
function toKey(date) {
    var month = String(date.getMonth() + 1);
    var day = String(date.getDate());
    if (month.length < 2) {
        month = "0" + month;
    }
    if (day.length < 2) {
        day = "0" + day;
    }
    return date.getFullYear() + "-" + month + "-" + day;
}

// Begrenzt einen Wert auf das Intervall [min, max].
function clamp(value, min, max) {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}

// Prueft, ob das Datum ein Wochentag (Montag bis Freitag) ist.
function isWeekday(date) {
    var day = date.getDay();
    return day !== 0 && day !== 6;
}

// Liefert Montag 00:00 der Woche, in der das Datum liegt.
function getWeekStart(date) {
    var daysSinceMonday = (date.getDay() + 6) % 7;
    return addDays(date, -daysSinceMonday);
}

// Formatiert ein Datum als TT.MM.JJJJ.
function formatDate(date) {
    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// Formatiert ein Datum mit Wochentag, z. B. "Mo., 07.09.2026".
function formatDateWithWeekday(date) {
    return date.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// ---------------------------------------------------------------------------
// Schultage
// ---------------------------------------------------------------------------

// Erzeugt ein Objekt, dessen Schluessel alle schulfreien Tage der Konfiguration sind.
function buildFreeDayLookup() {
    var lookup = {};
    var periods = FREE_PERIODS.concat(SCHOOL_AUTONOMOUS_DAYS);

    periods.forEach(function (period) {
        var current = parseIsoDate(period.from);
        var last = parseIsoDate(period.to);
        while (current.getTime() <= last.getTime()) {
            lookup[toKey(current)] = period.label;
            current = addDays(current, 1);
        }
    });

    return lookup;
}

// Liefert alle Schultage im Gesamtzeitraum aufsteigend sortiert.
function buildSchoolDays() {
    var freeDays = buildFreeDayLookup();
    var days = [];
    var current = startOfDay(RANGE_START);

    while (current.getTime() < RANGE_END.getTime()) {
        if (isWeekday(current) && freeDays[toKey(current)] === undefined) {
            days.push(current);
        }
        current = addDays(current, 1);
    }

    return days;
}

// Liefert alle Schultage, die im Kalendermonat des Referenzdatums liegen.
function getMonthDays(allDays, reference) {
    return allDays.filter(function (day) {
        return day.getFullYear() === reference.getFullYear() && day.getMonth() === reference.getMonth();
    });
}

// Liefert alle Schultage der Kalenderwoche (Montag bis Sonntag) des Referenzdatums.
function getWeekDays(allDays, reference) {
    var weekStart = getWeekStart(reference).getTime();
    var weekEnd = addDays(getWeekStart(reference), 7).getTime();
    return allDays.filter(function (day) {
        return day.getTime() >= weekStart && day.getTime() < weekEnd;
    });
}

// Berechnet den Stand fuer eine Liste von Schultagen.
// passed: Anzahl der Schultage bis einschliesslich heute.
// figureIndex: Index des Punktes, auf dem die Figur steht.
function calculateState(days, today) {
    var todayKey = toKey(today);
    var passed = 0;
    var isSchoolToday = false;

    days.forEach(function (day) {
        var key = toKey(day);
        if (key <= todayKey) {
            passed += 1;
        }
        if (key === todayKey) {
            isSchoolToday = true;
        }
    });

    return {
        total: days.length,
        passed: passed,
        remaining: days.length - passed,
        isSchoolToday: isSchoolToday,
        figureIndex: passed > 0 ? passed - 1 : 0
    };
}

// Liefert den Zustand eines Punktes: "done", "today" oder "future".
function getDotState(index, state) {
    if (index < state.passed - 1) {
        return "done";
    }
    if (index === state.passed - 1) {
        return state.isSchoolToday ? "today" : "done";
    }
    return "future";
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

// Beschreibt die verbleibenden Schultage als Text.
function formatRemaining(state) {
    if (state.total === 0) {
        return "";
    }
    if (state.remaining === 0) {
        return "Keine weiteren Schultage";
    }
    if (state.remaining === 1) {
        return "Noch 1 Schultag";
    }
    return "Noch " + state.remaining + " Schultage";
}

// Beschreibt den heutigen Tag im Kontext der Liste.
function formatStatus(days, state) {
    if (state.total === 0) {
        return "";
    }
    if (state.passed === 0) {
        return "Beginnt am " + formatDate(days[0]);
    }
    if (state.isSchoolToday) {
        if (state.remaining === 0) {
            return "Heute ist der letzte Schultag";
        }
        return "Heute ist Schultag " + state.passed;
    }
    if (state.remaining === 0) {
        return "Alle Schultage geschafft";
    }
    return "Heute schulfrei";
}

// ---------------------------------------------------------------------------
// Figur
// ---------------------------------------------------------------------------

// Liefert das SVG der huepfenden Figur (Schueler mit Rucksack).
function createFigureElement() {
    var figure = document.createElement("div");
    figure.className = "figure";
    figure.setAttribute("aria-hidden", "true");
    figure.innerHTML =
        '<svg viewBox="0 0 36 40" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<rect x="4" y="19" width="10" height="13" rx="3" fill="#f59e0b" stroke="#111827" stroke-width="2"/>' +
        '<rect x="11" y="19" width="16" height="14" rx="6" fill="#4338ca" stroke="#111827" stroke-width="2"/>' +
        '<rect x="12" y="32" width="5" height="6" rx="2" fill="#111827"/>' +
        '<rect x="20" y="32" width="5" height="6" rx="2" fill="#111827"/>' +
        '<circle cx="19" cy="12" r="10" fill="#fde68a" stroke="#111827" stroke-width="2"/>' +
        '<circle cx="15.5" cy="11" r="1.7" fill="#111827"/>' +
        '<circle cx="22.5" cy="11" r="1.7" fill="#111827"/>' +
        '<path d="M15 15.5 Q19 19 23 15.5" fill="none" stroke="#111827" stroke-width="1.8" stroke-linecap="round"/>' +
        "</svg>";
    return figure;
}

// Liefert die obere linke Position der Figur, sodass sie auf dem Punkt mit dem Index steht.
function getFigurePosition(track, index) {
    var dot = track.dots[index];
    var figureWidth = track.figure.offsetWidth;
    var figureHeight = track.figure.offsetHeight;

    return {
        x: dot.offsetLeft + dot.offsetWidth / 2 - figureWidth / 2,
        y: dot.offsetTop + dot.offsetHeight * 0.1 - figureHeight
    };
}

// Erzeugt den CSS-Transform-Wert fuer eine Position.
function toTranslate(x, y) {
    return "translate(" + x + "px, " + y + "px)";
}

// Setzt die Figur ohne Animation auf einen Punkt.
function placeFigure(track, index) {
    if (track.dots.length === 0) {
        track.figure.style.display = "none";
        return;
    }
    track.figure.style.display = "";
    var position = getFigurePosition(track, index);
    track.figure.style.transform = toTranslate(position.x, position.y);
}

// Laesst die Figur im Bogen von einem Punkt zum naechsten springen.
function hopFigure(track, fromIndex, toIndex) {
    var from = getFigurePosition(track, fromIndex);
    var to = getFigurePosition(track, toIndex);
    var peakHeight = track.figure.offsetHeight * 0.7;
    var peakY = Math.min(from.y, to.y) - peakHeight;
    var middleX = (from.x + to.x) / 2;

    track.figure.style.transform = toTranslate(to.x, to.y);

    if (typeof track.figure.animate !== "function") {
        return;
    }

    track.figure.animate(
        [
            { transform: toTranslate(from.x, from.y), easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
            { transform: toTranslate(middleX, peakY), easing: "cubic-bezier(0.6, 0, 0.8, 0.4)", offset: 0.5 },
            { transform: toTranslate(to.x, to.y) }
        ],
        {
            duration: HOP_DURATION_MS,
            delay: HOP_DELAY_MS,
            fill: "backwards"
        }
    );
}

// Prueft, ob der Nutzer reduzierte Bewegung bevorzugt.
function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// Darstellung
// ---------------------------------------------------------------------------

// Erzeugt den Zustand einer Bahn (Track) fuer das Praefix total, month oder week.
function createTrack(prefix) {
    return {
        prefix: prefix,
        element: document.getElementById(prefix + "-track"),
        figure: null,
        dots: [],
        listKey: "",
        figureIndex: -1
    };
}

// Gruppiert Schultage nach Kalenderwoche, damit zwischen den Wochen eine Luecke entsteht.
function groupByWeek(days) {
    var groups = [];
    var currentKey = "";

    days.forEach(function (day) {
        var weekKey = toKey(getWeekStart(day));
        if (weekKey !== currentKey) {
            groups.push([]);
            currentKey = weekKey;
        }
        groups[groups.length - 1].push(day);
    });

    return groups;
}

// Baut die Punkte einer Bahn neu auf und animiert bei Bedarf den Sprung der Figur.
function renderTrack(track, days, state) {
    var listKey = days.length > 0 ? toKey(days[0]) + "#" + days.length : "leer";
    var isSameList = track.listKey === listKey;
    var previousIndex = isSameList ? track.figureIndex : state.figureIndex - 1;

    track.element.innerHTML = "";
    track.dots = [];

    if (days.length === 0) {
        var empty = document.createElement("p");
        empty.className = "track__empty";
        empty.textContent = "Keine Schultage in diesem Zeitraum";
        track.element.appendChild(empty);
        track.figure = createFigureElement();
        track.listKey = listKey;
        track.figureIndex = -1;
        return;
    }

    var dotIndex = 0;
    groupByWeek(days).forEach(function (group) {
        var groupElement = document.createElement("div");
        groupElement.className = "week-group";

        group.forEach(function (day) {
            var dot = document.createElement("span");
            dot.className = "dot dot--" + getDotState(dotIndex, state);
            dot.title = formatDateWithWeekday(day);
            groupElement.appendChild(dot);
            track.dots.push(dot);
            dotIndex += 1;
        });

        track.element.appendChild(groupElement);
    });

    track.figure = createFigureElement();
    track.element.appendChild(track.figure);

    var shouldHop = previousIndex >= 0 && previousIndex !== state.figureIndex && !prefersReducedMotion();

    if (shouldHop) {
        hopFigure(track, previousIndex, state.figureIndex);
    } else {
        placeFigure(track, state.figureIndex);
    }

    track.listKey = listKey;
    track.figureIndex = state.figureIndex;
}

// Aktualisiert Zaehler, Beschriftungen und Barrierefreiheits-Attribute einer Karte.
function renderCardTexts(track, days, state) {
    var prefix = track.prefix;

    document.getElementById(prefix + "-count").textContent = state.passed + " / " + state.total;
    document.getElementById(prefix + "-status").textContent = formatStatus(days, state);
    document.getElementById(prefix + "-remaining").textContent = formatRemaining(state);

    if (days.length > 0) {
        document.getElementById(prefix + "-range").textContent =
            formatDate(days[0]) + " - " + formatDate(days[days.length - 1]);
    } else {
        document.getElementById(prefix + "-range").textContent = "";
    }

    track.element.setAttribute("aria-valuemax", String(state.total));
    track.element.setAttribute("aria-valuenow", String(state.passed));
    track.element.setAttribute("aria-valuetext", state.passed + " von " + state.total + " Schultagen");
}

// Zaehlt die Wochentage (Montag bis Freitag) einer Periode, die im Gesamtzeitraum liegen.
function countWeekdaysInRange(period) {
    var count = 0;
    var current = parseIsoDate(period.from);
    var last = parseIsoDate(period.to);

    while (current.getTime() <= last.getTime()) {
        var inRange = current.getTime() >= RANGE_START.getTime() && current.getTime() < RANGE_END.getTime();
        if (inRange && isWeekday(current)) {
            count += 1;
        }
        current = addDays(current, 1);
    }

    return count;
}

// Fuellt die Liste der nicht gezaehlten Tage im Footer.
function renderFreeList() {
    var list = document.getElementById("free-list");
    var periods = FREE_PERIODS.concat(SCHOOL_AUTONOMOUS_DAYS);

    list.innerHTML = "";

    periods.forEach(function (period) {
        var item = document.createElement("li");
        var from = parseIsoDate(period.from);
        var to = parseIsoDate(period.to);
        var weekdays = countWeekdaysInRange(period);
        var dateText = period.from === period.to ? formatDate(from) : formatDate(from) + " - " + formatDate(to);
        var suffix = weekdays === 0 ? "fällt auf ein Wochenende" : weekdays + (weekdays === 1 ? " Schultag entfällt" : " Schultage entfallen");

        item.textContent = period.label + ": " + dateText + " (" + suffix + ")";
        list.appendChild(item);
    });
}

// ---------------------------------------------------------------------------
// Hauptroutine
// ---------------------------------------------------------------------------

var allSchoolDays = buildSchoolDays();
var tracks = {};
var lastDayKey = "";

TRACK_PREFIXES.forEach(function (prefix) {
    tracks[prefix] = createTrack(prefix);
});

// Berechnet alle Bahnen neu und zeichnet sie.
function renderAll(now) {
    var today = startOfDay(now);

    // Referenzdatum innerhalb des Gesamtzeitraums, damit Wochen- und Monatskarte
    // vor Beginn bzw. nach Ende sinnvolle Werte anzeigen.
    var reference = new Date(clamp(
        today.getTime(),
        RANGE_START.getTime(),
        RANGE_END.getTime() - 1
    ));

    var daysByPrefix = {
        total: allSchoolDays,
        month: getMonthDays(allSchoolDays, reference),
        week: getWeekDays(allSchoolDays, reference)
    };

    TRACK_PREFIXES.forEach(function (prefix) {
        var days = daysByPrefix[prefix];
        var state = calculateState(days, today);
        renderTrack(tracks[prefix], days, state);
        renderCardTexts(tracks[prefix], days, state);
    });
}

// Aktualisiert die Uhr jede Sekunde und zeichnet die Bahnen nur bei Tageswechsel neu.
function update() {
    var now = new Date();
    var dayKey = toKey(now);

    document.getElementById("clock").textContent = now.toLocaleString("de-DE");

    if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        renderAll(now);
    }
}

// Positioniert die Figuren nach einer Groessenaenderung neu (ohne Animation).
var resizePending = false;
function handleResize() {
    if (resizePending) {
        return;
    }
    resizePending = true;
    window.requestAnimationFrame(function () {
        resizePending = false;
        TRACK_PREFIXES.forEach(function (prefix) {
            var track = tracks[prefix];
            if (track.dots.length > 0 && track.figureIndex >= 0) {
                placeFigure(track, track.figureIndex);
            }
        });
    });
}

document.getElementById("range-label").textContent =
    formatDate(RANGE_START) + " bis " + formatDate(addDays(RANGE_END, -1)) + " - nur Schultage in Niederösterreich";

renderFreeList();
update();
setInterval(update, 1000);
window.addEventListener("resize", handleResize);