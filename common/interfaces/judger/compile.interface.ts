import {Constraints} from './sandbox.interface';
import {SubmissionLang} from '../../configs/judger/languages';

interface CompileTask {
  source: string;
  constrains: Constraints;
  language: SubmissionLang;
  submissionID: string;
}

export {CompileTask};
