# Deck Library

The deck library presents Magic: The Gathering decks for reference and analysis while distinguishing the owner's lasting collection from a visitor's temporary inputs.

## Language

**Deck**:
A named collection of Magic cards divided into one maindeck and, optionally, a sideboard, designated Commanders, and a Companion. Planning cards under consideration are not part of the Deck.
_Avoid_: List

**Commander**:
A card designated to lead a Deck and kept distinct from its maindeck. A Deck may designate more than one Commander, and each contributes to the Deck's card count.

**Companion**:
An optional card designated as a Deck's Companion and kept distinct from its sideboard. It is associated with the Deck but does not contribute to the Deck's card count.

**Published Deck**:
A Deck in the owner's lasting collection that is presented through a Deck Page. Published Decks are read-only on the site.
_Avoid_: Saved deck, permanent deck

**Source-Backed Published Deck**:
A Published Deck whose card composition originates from an identified external Deck while its Deck Page and Primer remain locally authored.
_Avoid_: Imported deck, synced deck

**Imported Deck**:
A Deck supplied in a visitor's browser for temporary display or analysis. It is not part of the owner's collection and is not published by the site.
_Avoid_: Uploaded deck, saved deck

**Deck Page**:
The shareable presentation of one Published Deck, including its title, format, and an optional Primer.
_Avoid_: Page definition, deck article

**Primer**:
Optional authored guidance about a Deck, such as its strategy, card choices, matchups, or play patterns. A Primer may range from a short note to a long-form guide.
_Avoid_: Writeup, description

**Printing Reference**:
An optional set and collector-number pair that identifies the intended physical printing of a card. An invalid Printing Reference does not invalidate the card, but it must remain visible as a warning.
_Avoid_: Card identity

**Resolved Printing**:
The physical printing selected for displaying a card. Selection prefers a valid Printing Reference, then a Preferred Printing, then the newest eligible English paper printing.
_Avoid_: Default card

**Preferred Printing**:
The owner's explicit fallback choice of physical printing for a card when a Deck does not provide a valid Printing Reference.
_Avoid_: Default printing

## Example dialogue

> **Developer:** Is the deck at this shared URL part of your collection?
>
> **Owner:** Yes, it is a Published Deck. A visitor can also paste an Imported Deck for analysis, but that does not publish it or add it to my collection.
>
> **Developer:** Where should your matchup notes and deck description appear?
>
> **Owner:** Put them in the Published Deck's Primer; they are commentary about the Deck, not part of its card composition.
>
> **Developer:** Should I include the cards you are considering from the source Deck?
>
> **Owner:** No. Preserve its Commanders and Companion, but planning cards are not part of the Published Deck.
>
> **Developer:** This card's Printing Reference is invalid. Should the Deck fail?
>
> **Owner:** No. Choose a fallback Resolved Printing and show a warning so I can correct the source later.
