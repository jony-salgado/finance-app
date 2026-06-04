import { CardResumoComponent } from './card-resumo.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/core', () => {
  const mockInput = <T>(initialValue?: T): any => {
    let val: T | undefined = initialValue;
    const s: any = (newVal?: T) => {
      if (newVal !== undefined) val = newVal;
      return val;
    };
    s.required = s;
    return s;
  };

  return {
    Component: () => (target: any) => target,
    ChangeDetectionStrategy: { OnPush: 0 },
    input: mockInput,
  };
});

describe('CardResumoComponent Unit Tests', () => {
  let component: CardResumoComponent;

  beforeEach(() => {
    component = new CardResumoComponent();
  });

  it('should correctly format amount', () => {
    /**
     * Test case to verify currency formatting.
     */
    const result: string = component.format(1250.75);
    const cleanResult: string = result.replace(/\u00a0/g, ' ');
    expect(cleanResult).toContain('R$');
    expect(cleanResult).toContain('1.250,75');
  });
});
