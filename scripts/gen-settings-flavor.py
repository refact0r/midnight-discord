#!/usr/bin/env python3
"""Generate themes/flavors/midnight-settings.theme.css for midnight-discord.

Each setting is exposed as a namespaced `--midnight-*` custom property declared with an
`@property` block (BetterDiscord / Vencord theme-settings format), then mapped onto
midnight's existing public variables with a fallback equal to the default, e.g.

    body { --gap: var(--midnight-gap, 12px); }

The mapping lives on `body` / `:root` exactly where midnight's own variables live, so it
overrides the build's defaults the same way midnight.theme.css does, while the
`--midnight-*` value itself is read from `:root` (where clients write user overrides).
"""
import sys

import os
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "themes", "flavors", "midnight-settings.theme.css")

ONOFF = 'options: "on=On | off=Off"; checkbox: true;'

# When False, settings whose midnight default aliases another variable (e.g. accent-1 -> blue-1) get a plain
# literal default. When True, the link is kept via a `:root { --midnight-accent-1: var(--midnight-blue-1) }`
# block so the setting follows the other one until overridden. Off for now: clients have no UI to show or
# manage such links, so the behaviour would be invisible and un-resettable per setting.
LINKED_DEFAULTS = False

# (var, syntax, default, label, note, extra-descriptors, target)
#   syntax: one of "*", "<color>", "<length>", "<percentage>", "<integer>", "<url>", "<custom-ident>"
#   default: literal default, or (literal, link) when midnight's default is an alias of another
#            variable: the literal is the @property initial-value (what the UI shows, and what
#            applies if the link cannot resolve) and the link is declared on :root so the setting
#            keeps following the aliased setting until the user overrides it
#   extra: raw descriptor string appended inside the block (min/max/step/options/checkbox/file)
#   target: "body" or "root" (which mapping block the variable is written to), or None when the
#           setting does not map 1:1 onto a midnight variable (see DERIVED)
SETTINGS = [
    # ---- font ----
    ("section", "font"),
    ("font", "*", "'figtree'", "Font", "Font family for normal text. Set to '' for the default Discord font.", "", "body"),
    ("code-font", "*", "''", "Code font", "Font family for code blocks. Set to '' for the default Discord font.", "", "body"),
    ("font-weight", "<integer>", "400", "Font weight", "Weight of normal text. Does not affect bold text.", "min: 100; max: 900; step: 100;", "body"),
    # ---- sizes ----
    ("section", "sizes"),
    ("gap", "<length>", "12px", "Gap", "Spacing between panels.", "min: 0; max: 32; step: 1;", "body"),
    ("divider-thickness", "<length>", "4px", "Divider thickness", "Thickness of the unread messages divider and highlighted message borders.", "min: 0; max: 12; step: 1;", "body"),
    ("border-thickness", "<length>", "1px", "Border thickness", "Thickness of borders around main panels. Does not affect other borders.", "min: 0; max: 6; step: 1;", "body"),
    # ---- animations ----
    ("section", "animations"),
    ("animations", "<custom-ident>", "on", "Animations", "Enable animations and transitions.", ONOFF, "body"),
    ("list-item-transition", "*", "0.2s ease", "List item transition", "Transition for list items.", "", "body"),
    ("dms-icon-svg-transition", "*", "0.4s ease", "DMs icon transition", "Transition for the DMs icon.", "", "body"),
    ("border-hover-transition", "*", "0.2s ease", "Border hover transition", "Transition for borders when hovered.", "", "body"),
    # ---- top bar ----
    ("section", "top bar"),
    ("top-bar-height", "<length>", ("12px", "var(--midnight-gap)"), "Top bar height", "Height of the top bar. Discord default is 36px, old Discord style is 24px. var(--gap) is recommended when the button position is set to the channel titlebar.", "", "body"),
    ("top-bar-button-position", "<custom-ident>", "titlebar", "Top bar button position", "Where to put the inbox and help buttons. Channel titlebar hides the title.", 'options: "off=Default | hide=Hidden | serverlist=Server list | titlebar=Channel titlebar";', "body"),
    ("top-bar-title-position", "<custom-ident>", "off", "Top bar title position", "Position of the title in the top bar.", 'options: "off=Centered | hide=Hidden | left=Left (like old Discord)";', "body"),
    ("subtle-top-bar-title", "<custom-ident>", "off", "Subtle top bar title", "Hide the icon and use a subtle text color, like old Discord.", ONOFF, "body"),
    # ---- window controls ----
    ("section", "window controls"),
    ("custom-window-controls", "<custom-ident>", "on", "Custom window controls", "Use midnight's window controls instead of the default ones.", ONOFF, "body"),
    ("window-control-size", "<length>", "14px", "Window control size", "Size of the custom window controls.", "min: 8; max: 24; step: 1;", "body"),
    # ---- dms button ----
    ("section", "dms button"),
    ("custom-dms-icon", "<custom-ident>", "custom", "DMs icon", "Icon shown on the DMs button.", 'options: "off=Default Discord icon | hide=Hidden | custom=Custom icon";', "body"),
    ("dms-icon-svg-url", "<url>", "url('https://refact0r.github.io/midnight-discord/assets/Font_Awesome_5_solid_moon.svg')", "DMs icon SVG", "URL of the custom DMs icon. Must be an SVG.", "", "body"),
    ("dms-icon-svg-size", "<percentage>", "90%", "DMs icon size", "Size of the SVG (CSS mask-size).", "min: 0; max: 100; step: 5;", "body"),
    ("dms-icon-color-before", "<color>", ("hsl(220, 15%, 40%)", "var(--midnight-text-4)"), "DMs icon color", "Normal icon color.", "", "body"),
    ("dms-icon-color-after", "<color>", ("hsla(220, 15%, 10%, 1)", "var(--midnight-text-0)"), "DMs icon hover color", "Icon color when the button is hovered or selected.", "", "body"),
    ("custom-dms-background", "<custom-ident>", "off", "DMs button background", "Background of the DMs button.", 'options: "off=Off | image=Image | color=Color or gradient";', "body"),
    ("dms-background-image-url", "<url>", "url('')", "DMs background image", "Background image for the DMs button. Requires the DMs button background to be set to Image.", "file: true;", "body"),
    ("dms-background-image-size", "*", "cover", "DMs background image size", "Size of the background image (CSS background-size).", "", "body"),
    ("dms-background-color-1", "<color>", ("oklch(70% 0.1 215)", "var(--midnight-blue-2)"), "DMs background color 1", "First color of the DMs button background gradient. Set all three colors to the same value for a solid color. Requires the DMs button background to be set to Color.", "", None),
    ("dms-background-color-2", "<color>", ("oklch(70% 0.11 310)", "var(--midnight-purple-2)"), "DMs background color 2", "Second color of the DMs button background gradient.", "", None),
    ("dms-background-color-3", "<color>", ("oklch(70% 0.12 0)", "var(--midnight-red-2)"), "DMs background color 3", "Third color of the DMs button background gradient.", "", None),
    # ---- background image ----
    ("section", "background image"),
    ("background-image", "<custom-ident>", "off", "Background image", "Show a background image behind the app. Set the image below.", ONOFF, "body"),
    ("background-image-url", "<url>", "url('')", "Background image file", "URL of the background image.", "file: true;", "body"),
    # ---- transparency/blur ----
    ("section", "transparency and blur"),
    ("transparency-tweaks", "<custom-ident>", "off", "Transparency tweaks", "Remove some elements for better transparency. Requires transparent background colors, e.g. hsla(220, 15%, 10%, 0.7) for Background 4.", ONOFF, "body"),
    ("remove-bg-layer", "<custom-ident>", "off", "Remove background layer", "Remove the base Background 3 layer for use with window transparency. Overrides the background image.", ONOFF, "body"),
    ("panel-blur", "<custom-ident>", "off", "Panel blur", "Blur the background of panels.", ONOFF, "body"),
    ("blur-amount", "<length>", "12px", "Blur amount", "Amount of blur applied to panels.", "min: 0; max: 40; step: 1;", "body"),
    ("bg-floating", "<color>", ("hsla(220, 15%, 13%, 1)", "var(--midnight-bg-3)"), "Floating panel background", "Set this to a more opaque color if floating panels look too transparent. Only applies if panel blur is on.", "", "body"),
    # ---- chatbar ----
    ("section", "chatbar"),
    ("custom-chatbar", "<custom-ident>", "off", "Chatbar style", "Separated detaches the chatbar from the chat.", 'options: "off=Default | separated=Separated";', "body"),
    ("chatbar-height", "<length>", "47px", "Chatbar height", "56px is the Discord default, 47px aligns with the user panel, 56px is recommended for the separated chatbar.", "min: 40; max: 80; step: 1;", "body"),
    # ---- other ----
    ("section", "other"),
    ("small-user-panel", "<custom-ident>", "on", "Small user panel", "Smaller user panel like in old Discord.", ONOFF, "body"),

    # ---- colors (live on :root, like midnight's color options) ----
    ("section", "colors"),
    ("colors", "<custom-ident>", "on", "Midnight colors", "Use midnight's custom colors. Off uses Discord's default colors.", ONOFF, "root"),
    ("text-0", "<color>", ("hsla(220, 15%, 10%, 1)", "var(--midnight-bg-4)"), "Text 0", "Text on colored elements.", "", "root"),
    ("text-1", "<color>", "hsl(220, 45%, 95%)", "Text 1", "Other normally white text.", "", "root"),
    ("text-2", "<color>", "hsl(220, 25%, 70%)", "Text 2", "Headings and important text.", "", "root"),
    ("text-3", "<color>", "hsl(220, 20%, 60%)", "Text 3", "Normal text.", "", "root"),
    ("text-4", "<color>", "hsl(220, 15%, 40%)", "Text 4", "Icon buttons and channels.", "", "root"),
    ("text-5", "<color>", "hsl(220, 15%, 25%)", "Text 5", "Muted channels, chats and timestamps.", "", "root"),
    ("bg-1", "<color>", "hsla(220, 15%, 20%, 1)", "Background 1", "Dark buttons when clicked.", "", "root"),
    ("bg-2", "<color>", "hsla(220, 15%, 16%, 1)", "Background 2", "Dark buttons.", "", "root"),
    ("bg-3", "<color>", "hsla(220, 15%, 13%, 1)", "Background 3", "Spacing and secondary elements.", "", "root"),
    ("bg-4", "<color>", "hsla(220, 15%, 10%, 1)", "Background 4", "Main background color.", "", "root"),
    ("hover", "<color>", "hsla(221, 19%, 40%, 0.1)", "Hover", "Channels and buttons when hovered.", "", "root"),
    ("active", "<color>", "hsla(220, 19%, 40%, 0.2)", "Active", "Channels and buttons when clicked or selected.", "", "root"),
    ("active-2", "<color>", "hsla(220, 19%, 40%, 0.3)", "Active 2", "Extra state for transparent buttons.", "", "root"),
    ("message-hover", "<color>", "hsla(220, 0%, 0%, 0.1)", "Message hover", "Messages when hovered.", "", "root"),
    ("accent-1", "<color>", ("oklch(75% 0.1 215)", "var(--midnight-blue-1)"), "Accent 1", "Links and other accent text.", "", "root"),
    ("accent-2", "<color>", ("oklch(70% 0.1 215)", "var(--midnight-blue-2)"), "Accent 2", "Small accent elements.", "", "root"),
    ("accent-3", "<color>", ("oklch(65% 0.1 215)", "var(--midnight-blue-3)"), "Accent 3", "Accent buttons.", "", "root"),
    ("accent-4", "<color>", ("oklch(60% 0.1 215)", "var(--midnight-blue-4)"), "Accent 4", "Accent buttons when hovered.", "", "root"),
    ("accent-5", "<color>", ("oklch(55% 0.1 215)", "var(--midnight-blue-5)"), "Accent 5", "Accent buttons when clicked.", "", "root"),
    ("accent-new", "<color>", ("oklch(70% 0.1 215)", "var(--midnight-accent-2)"), "Accent (new)", "Things that are normally red, like the mute and deafen buttons.", "", "root"),
    ("mention-color", "<color>", ("oklch(70% 0.1 215)", "var(--midnight-accent-2)"), "Mention color", "Highlight color of messages that mention you.", "", None),
    ("reply-color", "<color>", ("hsl(220, 20%, 60%)", "var(--midnight-text-3)"), "Reply color", "Highlight color of messages that reply to you.", "", None),
    ("online", "<color>", ("oklch(70% 0.11 170)", "var(--midnight-green-2)"), "Online", "Online status color. #40a258 for the Discord default.", "", "root"),
    ("dnd", "<color>", ("oklch(70% 0.12 0)", "var(--midnight-red-2)"), "Do not disturb", "Do not disturb status color. #d83a41 for the Discord default.", "", "root"),
    ("idle", "<color>", ("oklch(75% 0.11 90)", "var(--midnight-yellow-2)"), "Idle", "Idle status color. #cc954c for the Discord default.", "", "root"),
    ("streaming", "<color>", ("oklch(70% 0.11 310)", "var(--midnight-purple-2)"), "Streaming", "Streaming status color. #9147ff for the Discord default.", "", "root"),
    ("offline", "<color>", ("hsl(220, 15%, 40%)", "var(--midnight-text-4)"), "Offline", "Offline status color. #82838b for the Discord default.", "", "root"),
    ("border-light", "<color>", ("hsla(221, 19%, 40%, 0.1)", "var(--midnight-hover)"), "Light border", "General light border color.", "", "root"),
    ("border", "<color>", ("hsla(220, 19%, 40%, 0.2)", "var(--midnight-active)"), "Border", "General normal border color.", "", "root"),
    ("border-hover", "<color>", ("hsla(220, 19%, 40%, 0.2)", "var(--midnight-active)"), "Border hover", "Border color of panels when hovered.", "", "root"),
    ("button-border", "<color>", "hsl(220, 0%, 100%, 0.1)", "Button border", "Neutral border color of buttons.", "", "root"),
    ("section", "base colors"),
]

PALETTE = {
    "red": ["oklch(75% 0.12 0)", "oklch(70% 0.12 0)", "oklch(65% 0.12 0)", "oklch(60% 0.12 0)", "oklch(55% 0.12 0)"],
    "green": ["oklch(75% 0.11 170)", "oklch(70% 0.11 170)", "oklch(65% 0.11 170)", "oklch(60% 0.11 170)", "oklch(55% 0.11 160)"],
    "blue": ["oklch(75% 0.1 215)", "oklch(70% 0.1 215)", "oklch(65% 0.1 215)", "oklch(60% 0.1 215)", "oklch(55% 0.1 215)"],
    "yellow": ["oklch(80% 0.11 90)", "oklch(75% 0.11 90)", "oklch(70% 0.11 90)", "oklch(65% 0.11 90)", "oklch(60% 0.11 90)"],
    "purple": ["oklch(75% 0.11 310)", "oklch(70% 0.11 310)", "oklch(65% 0.11 310)", "oklch(60% 0.11 310)", "oklch(55% 0.11 310)"],
}
for hue, shades in PALETTE.items():
    for i, value in enumerate(shades, start=1):
        SETTINGS.append((f"{hue}-{i}", "<color>", value, f"{hue.capitalize()} {i}", "Base palette, 1 is the lightest and 5 the darkest." if i == 1 else "", "", "root"))

# mapping lines for midnight variables that are built from several settings
DERIVED = {
    "body": [
        "    --dms-background-color: linear-gradient(70deg, var(--midnight-dms-background-color-1, var(--blue-2)), var(--midnight-dms-background-color-2, var(--purple-2)), var(--midnight-dms-background-color-3, var(--red-2)));",
    ],
    "root": [
        "    --mention: linear-gradient(to right, color-mix(in hsl, var(--midnight-mention-color, var(--accent-2)), transparent 90%) 40%, transparent);",
        "    --mention-hover: linear-gradient(to right, color-mix(in hsl, var(--midnight-mention-color, var(--accent-2)), transparent 95%) 40%, transparent);",
        "    --reply: linear-gradient(to right, color-mix(in hsl, var(--midnight-reply-color, var(--text-3)), transparent 90%) 40%, transparent);",
        "    --reply-hover: linear-gradient(to right, color-mix(in hsl, var(--midnight-reply-color, var(--text-3)), transparent 95%) 40%, transparent);",
    ],
}

HEADER = """/**
 * @name midnight (settings)
 * @description a dark, customizable discord theme. this flavor exposes midnight's options as theme settings (the @property based format shared with BetterDiscord).
 * @author refact0r
 * @version 2.1.1
 * @invite nz87hXyvcy
 * @website https://github.com/refact0r/midnight-discord
 * @source https://github.com/refact0r/midnight-discord/blob/master/themes/flavors/midnight-settings.theme.css
 * @authorId 508863359777505290
 * @authorLink https://www.refact0r.dev
*/

/* import theme modules */
@import url('https://refact0r.github.io/midnight-discord/build/midnight.css');

/*
 * theme settings
 *
 * every option below is declared as a namespaced --midnight-* custom property using an
 * @property block. clients that support theme settings read the name/note/options/min/max
 * descriptors to build a settings UI and write the chosen value to :root. the blocks at the
 * bottom of this file map each --midnight-* property onto midnight's regular variables, so
 * the build does not need to know about them. the fallback in each var() is the default.
 *
 * if your client does not support theme settings, you can still edit the fallback values at
 * the bottom of this file, exactly like in midnight.theme.css.
 */
"""

def prop_block(var, syntax, default, label, note, extra):
    lines = [f"@property --midnight-{var} {{"]
    lines.append(f'    syntax: "{syntax}";')
    lines.append("    inherits: true;")
    lines.append(f"    initial-value: {default};")
    if extra:
        for d in [d.strip() for d in split_descriptors(extra) if d.strip()]:
            lines.append(f"    {d};")
    lines.append(f'    name: "{label}";')
    if note:
        lines.append(f'    note: "{note}";')
    lines.append("}")
    return "\n".join(lines)

def split_descriptors(extra):
    # split on ';' outside quotes
    out, cur, q = [], "", None
    for ch in extra:
        if q:
            cur += ch
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
            cur += ch
        elif ch == ";":
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return out

def main():
    parts = [HEADER]
    body_map, root_map, link_map = [], [], []
    for entry in SETTINGS:
        if entry[0] == "section":
            parts.append(f"/* {entry[1]} */")
            continue
        var, syntax, default, label, note, extra, target = entry
        for bad in ('"', ";", "}"):
            assert bad not in note and bad not in label, (var, bad)
        if isinstance(default, tuple):
            default, link = default
            if LINKED_DEFAULTS:
                link_map.append(f"    --midnight-{var}: {link};")
        parts.append(prop_block(var, syntax, default, label, note, extra))
        if target is not None:
            line = f"    --{var}: var(--midnight-{var}, {default});"
            (body_map if target == "body" else root_map).append(line)
        parts.append("")

    # font-weight is a plain property on body in midnight, not a variable
    body_map = [l for l in body_map if not l.startswith("    --font-weight:")]
    body_map.insert(2, "    font-weight: var(--midnight-font-weight, 400); /* normal text font weight. DOES NOT AFFECT BOLD TEXT */")

    body_map += DERIVED["body"]
    root_map += DERIVED["root"]

    if link_map:
        parts.append("/* linked defaults: these settings follow another setting until overridden. */\n:root {\n" + "\n".join(link_map) + "\n}\n")
    parts.append("/* map the settings onto midnight's variables. the fallbacks are the defaults. */")
    parts.append("body {\n" + "\n".join(body_map) + "\n}\n")
    parts.append("/* color options */\n:root {\n" + "\n".join(root_map) + "\n}")
    css = "\n".join(parts).rstrip() + "\n"
    # collapse the blank line that follows a section comment
    css = css.replace("*/\n\n@property", "*/\n@property")
    with open(OUT, "w") as f:
        f.write(css)
    n = sum(1 for e in SETTINGS if e[0] != "section")
    print(f"wrote {OUT}: {n} settings, {len(css.splitlines())} lines")

if __name__ == "__main__":
    main()
