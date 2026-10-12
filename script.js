"use strict";

// Gesamtzeitraum: Start inklusive (07.09.2026 00:00), Ende exklusiv (01.05.2027 00:00),
// sodass der 30.04.2027 vollstaendig im Zeitraum liegt. Monate sind 0-basiert.
var RANGE_START = new Date(2026, 8, 7, 0, 0, 0, 0);
var RANGE_END = new Date(2027, 4, 1, 0, 0, 0, 0);

var MS_PER_DAY = 24 * 60 * 60 * 1000;

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

// Liefert den Fortschritt in Prozent (0 bis 100) von start bis end.
function calculateProgress(start, end, now) {
    var total = end.getTime() - start.getTime();
    var elapsed = now.getTime() - start.getTime();
    return clamp((elapsed / total) * 100, 0, 100);
}

// Liefert Montag 00:00 der Woche, in der das Datum liegt.
function getWeekStart(date) {
    var daysSinceMonday = (date.getDay() + 6) % 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday, 0, 0, 0, 0);
}

// Ermittelt Start und Ende (exklusiv) der aktuellen Woche, begrenzt auf den Gesamtzeitraum.
function getWeekPeriod(reference) {
    var rawStart = getWeekStart(reference);
    var rawEnd = new Date(rawStart.getFullYear(), rawStart.getMonth(), rawStart.getDate() + 7, 0, 0, 0, 0);
    return {
        start: new Date(Math.max(rawStart.getTime(), RANGE_START.getTime())),
        end: new Date(Math.min(rawEnd.getTime(), RANGE_END.getTime()))
    };
}

// Ermittelt Start und Ende (exklusiv) des aktuellen Monats, begrenzt auf den Gesamtzeitraum.
function getMonthPeriod(reference) {
    var rawStart = new Date(reference.getFullYear(), reference.getMonth(), 1, 0, 0, 0, 0);
    var rawEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 1, 0, 0, 0, 0);
    return {
        start: new Date(Math.max(rawStart.getTime(), RANGE_START.getTime())),
        end: new Date(Math.min(rawEnd.getTime(), RANGE_END.getTime()))
    };
}

// Formatiert eine Prozentzahl im deutschen Zahlenformat mit zwei Nachkommastellen.
function formatPercent(value) {
    return value.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " %";
}

// Formatiert ein Datum als TT.MM.JJJJ.
function formatDate(date) {
    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// Das Ende ist exklusiv, daher wird fuer die Anzeige ein Tag abgezogen.
function formatInclusiveEnd(endExclusive) {
    return formatDate(new Date(endExclusive.getTime() - MS_PER_DAY));
}

// Beschreibt die verbleibende Zeit als Text.
function formatRemaining(end, now) {
    var remainingMs = end.getTime() - now.getTime();
    if (remainingMs <= 0) {
        return "Abgeschlossen";
    }
    var days = Math.ceil(remainingMs / MS_PER_DAY);
    if (days === 1) {
        return "Noch 1 Tag";
    }
    return "Noch " + days + " Tage";
}

// Aktualisiert Balken, Prozentwert und Metadaten einer Karte.
function renderCard(prefix, period, now) {
    var percent = calculateProgress(period.start, period.end, now);

    document.getElementById(prefix + "-percent").textContent = formatPercent(percent);
    document.getElementById(prefix + "-fill").style.width = percent + "%";
    document.getElementById(prefix + "-bar").setAttribute("aria-valuenow", percent.toFixed(2));
    document.getElementById(prefix + "-range").textContent =
        formatDate(period.start) + " - " + formatInclusiveEnd(period.end);
    document.getElementById(prefix + "-remaining").textContent = formatRemaining(period.end, now);
}

// Hauptroutine: berechnet alle Fortschritte und aktualisiert die Oberflaeche.
function update() {
    var now = new Date();

    // Referenzdatum innerhalb des Gesamtzeitraums, damit Wochen- und Monatskarte
    // vor Beginn bzw. nach Ende sinnvolle Werte anzeigen.
    var reference = new Date(clamp(
        now.getTime(),
        RANGE_START.getTime(),
        RANGE_END.getTime() - 1
    ));

    renderCard("total", { start: RANGE_START, end: RANGE_END }, now);
    renderCard("month", getMonthPeriod(reference), now);
    renderCard("week", getWeekPeriod(reference), now);

    document.getElementById("range-label").textContent =
        formatDate(RANGE_START) + " bis " + formatInclusiveEnd(RANGE_END);
    document.getElementById("clock").textContent = now.toLocaleString("de-DE");
}

update();
setInterval(update, 1000);
