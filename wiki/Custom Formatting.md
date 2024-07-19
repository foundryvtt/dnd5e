![Up to date as of 3.3.0](https://img.shields.io/static/v1?label=dnd5e&message=3.3.0&color=informational)

The D&D system provides several new CSS classes for formatting text. These styles can be applied to any text field by editing the Source HTML </> and following the examples below.

## Advice and Quest Blocks
The fvtt advice and fvtt quest classes share the same format, displaying an image on the left with accompanying text in a boxed layout on the right.  
Specify the image using the img src attribute within the figure block and the text within the article block.

```html
<div class="fvtt advice">
    <figure class="icon">
        <img src="icons/equipment/chest/robe-layered-red.webp" class="round">
    </figure>
    <article>
        <h4>Casting in Armor</h4>
        <p>Because of the mental focus and precise gestures required for spellcasting, you must be proficient with the armor you are wearing to cast a spell. You are otherwise too distracted and physically hampered by your armor for spellcasting.</p>
    </article>
</div>
```
![](https://raw.githubusercontent.com/MaxPat931/dnd5e/stylez/wiki/images/styles/fvttadvice.png)

## Narrative
The fvtt narrative class creates a text box for read-aloud text.

```html
<div class="fvtt narrative">
    <p>The horses’ saddlebags have been looted. An empty leather map case lies nearby.</p>
</div>
```
![](https://raw.githubusercontent.com/MaxPat931/dnd5e/stylez/wiki/images/styles/fvttnarrative.png)

## Notable
The notable class is used within an aside tag to create a callout box for additional information.

```html
<aside class="notable">
    <h4>Joining a Secret Society</h4>
    <p>If the party helps Steve, the thief privately approaches certain members of the group and urges them to join the Secret Society of Stealing.</p>
</aside>
```
![](https://raw.githubusercontent.com/MaxPat931/dnd5e/stylez/wiki/images/styles/fvttnotable.png)
