# A small sunny moment

The picture shows a friendly little robot offering a bright sunflower to a
laughing girl in a meadow full of wildflowers. Warm light, butterflies, and
their shared moment give the scene its cheerful feel.

The Node program reads the JPEG beside itself, checks its signature, size,
dimensions, supported frame, and ending marker, then copies the unchanged image
to the configured output directory. It reports the destination, byte count,
dimensions, and SHA-256 digest.

It also rejects a frame unless both its width and height are positive.
