# Publish the BETA copy with GitHub Pages

This folder is independent of Desktop/3D Room/Web-ready. Only BETA copies were compressed. Videos retain their full duration at up to 640 pixels; still images are up to 1600 pixels; embedded model textures are up to 1024 pixels. Geometry is unchanged. Large source downloads are lossless ZIP archives with updated catalog/file-library links. The originals remain in 3D Room.

## BETA cursor exception

Ben waived the original-cursor requirement for this beta. Keep downloaded cursor source/license documentation. The exception is recorded in CURSOR-BETA-EXCEPTION.md; the original 3D Room project retains its requirement.

Some PNG images use a 256-color palette with transparency retained. Originals remain untouched in 3D Room.

## Verify before committing

Run npm run check:beta-files, npm run check:pages-size, npm test, and npm run check:publish. All must pass. MEDIA-COMPRESSION.json records size changes and source archives; MEDIA-VERIFICATION.json records validation results. MISSING-ICLOUD-FILES.md is the historical list; the check resolves restored files and their ZIP replacements.

## GitHub setup once the checks pass

1. Create a public GitHub repository for GitHub Free Pages.
2. Inside BETA run git init -b main, git add ., and git commit -m "Prepare 3D Room beta".
3. Run git remote add origin YOUR_REPOSITORY_URL and git push -u origin main.
4. Under Settings > Pages choose GitHub Actions.
5. Under Actions > Publish beta to GitHub Pages choose Run workflow. It checks publication permission, assets, size, and tests before deploying.
6. Open the deployed URL and test room loading, piece pages, videos, and mobile interaction.

The workflow is manual; pushing does not automatically deploy. No repository or upload has been created during local preparation. Files are below the ordinary GitHub per-file limit when the size check passes; Git LFS is unnecessary.

The public site is static. Local content and orientation editors require the Python server to save. Live loading excerpts fall back to neutral text without the API. Review editorial fields in pieces/pieces.json before making the repository public. Local preview: npm run serve.
