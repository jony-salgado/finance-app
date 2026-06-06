import { CardPizzaComponent } from './card-pizza.component';

jest.mock('@angular/common', () => ({
  CommonModule: {},
}));

jest.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

jest.mock('@angular/core', () => {
  const mockSignal = <T>(initialValue: T): any => {
    let val: T = initialValue;
    const s: any = () => val;
    s.set = (newVal: T) => {
      val = newVal;
    };
    s.update = (fn: (v: T) => T) => {
      val = fn(val);
    };
    return s;
  };

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
    Injectable: () => (target: any) => target,
    ChangeDetectionStrategy: { OnPush: 0 },
    signal: mockSignal,
    input: mockInput,
    computed: (fn: any) => {
      return () => fn();
    },
    inject: (token: any) => {
      if (token && token.name === 'PrivacyService') {
        return {
          isPrivateMode: () => false,
        };
      }
      return null;
    },
  };
});

describe('CardPizzaComponent Unit Tests', () => {
  let component: CardPizzaComponent;

  beforeEach(() => {
    component = new CardPizzaComponent();
  });

  it('should correctly format currency in BRL pattern', () => {
    /**
     * Test case to verify that the currency formatter produces the BRL formatting.
     */
    const result: string = component.format(150.5);
    const cleanResult: string = result.replace(/\u00a0/g, ' ');
    expect(cleanResult).toContain('R$');
    expect(cleanResult).toContain('150,50');
  });

  it('should calculate gradient stops correctly from input data', () => {
    /**
     * Test case to verify gradientStops computed signal behaves correctly.
     */
    const inputData: any[] = [
      { id: '1', name: 'Alimentação', percentage: 40, hexColor: '#ff0000', amount: 40.0 },
      { id: '2', name: 'Transporte', percentage: 60, hexColor: '#0000ff', amount: 60.0 },
    ];

    // Set inputs via type casting to bypass read-only signal compile checks
    (component.data as any)(inputData);

    const stops: string = component.gradientStops();
    expect(stops).toBe('#ff0000 0% 40%, #0000ff 40% 100%');
  });
});
