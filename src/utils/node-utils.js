import fs from 'fs';
import Handlebars from 'handlebars';

export function getHandlebarsTemplate(file) {
  return Handlebars.compile(fs.readFileSync(file).toString());
}
